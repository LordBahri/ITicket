import { Client as SshClient } from "ssh2";
import sql from "mssql";
import { env } from "../config/env";

export interface SageStepResult {
  ok: boolean;
  message: string;
}

export interface SageAutomationResult {
  rdp: SageStepResult;
  files: SageStepResult;
  sql: SageStepResult;
}

function psQuote(value: string): string {
  // Échappe une chaîne pour une insertion sûre entre guillemets simples PowerShell.
  return `'${value.replace(/'/g, "''")}'`;
}

async function runOnAppServer(adUsername: string, sageDatabaseName: string): Promise<{ rdp: SageStepResult; files: SageStepResult }> {
  if (!env.sage.appServerHost || !env.sage.appServerUsername) {
    return {
      rdp: { ok: false, message: "SAGE_APP_SSH_HOST/SAGE_APP_SSH_USERNAME non configurés" },
      files: { ok: false, message: "SAGE_APP_SSH_HOST/SAGE_APP_SSH_USERNAME non configurés" },
    };
  }

  const destDir = env.sage.filesDestPattern.replace("{adUsername}", adUsername);
  const sourceGcm = `${env.sage.filesSourceDir}\\${sageDatabaseName}.gcm`.replace(/\\{2,}/g, "\\");
  const sourceMae = `${env.sage.filesSourceDir}\\${sageDatabaseName}.mae`.replace(/\\{2,}/g, "\\");

  const script = [
    "$ErrorActionPreference = 'Stop'",
    "try {",
    `  $group = ${psQuote(env.sage.rdpLocalGroup)}`,
    `  $member = ${psQuote(adUsername)}`,
    "  $existing = Get-LocalGroupMember -Group $group -Member $member -ErrorAction SilentlyContinue",
    "  if (-not $existing) { Add-LocalGroupMember -Group $group -Member $member }",
    "  Write-Output 'RDP:OK'",
    "} catch {",
    "  Write-Output ('RDP:ERROR:' + $_.Exception.Message)",
    "}",
    "try {",
    `  New-Item -ItemType Directory -Force -Path ${psQuote(destDir)} | Out-Null`,
    `  Copy-Item -Path ${psQuote(sourceGcm)},${psQuote(sourceMae)} -Destination ${psQuote(destDir)} -Force`,
    "  Write-Output 'FILES:OK'",
    "} catch {",
    "  Write-Output ('FILES:ERROR:' + $_.Exception.Message)",
    "}",
  ].join("\r\n");

  const output = await execPowerShell(script);

  return {
    rdp: parseMarker(output, "RDP"),
    files: parseMarker(output, "FILES"),
  };
}

function parseMarker(output: string, marker: string): SageStepResult {
  const okLine = output.split(/\r?\n/).find((line) => line.startsWith(`${marker}:OK`));
  if (okLine) return { ok: true, message: "OK" };
  const errorLine = output.split(/\r?\n/).find((line) => line.startsWith(`${marker}:ERROR:`));
  if (errorLine) return { ok: false, message: errorLine.slice(`${marker}:ERROR:`.length).trim() };
  return { ok: false, message: `Aucun résultat reçu pour ${marker} (sortie inattendue : ${output.slice(0, 300)})` };
}

function execPowerShell(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new SshClient();
    let stdout = "";
    let stderr = "";

    conn
      .on("ready", () => {
        conn.exec(`powershell.exe -NoProfile -NonInteractive -Command -`, (err, stream) => {
          if (err) {
            conn.end();
            reject(err);
            return;
          }
          stream
            .on("close", () => {
              conn.end();
              if (stdout.trim().length === 0 && stderr.trim().length > 0) {
                reject(new Error(stderr.trim()));
              } else {
                resolve(stdout);
              }
            })
            .on("data", (data: Buffer) => {
              stdout += data.toString();
            })
            .stderr.on("data", (data: Buffer) => {
              stderr += data.toString();
            });
          stream.end(script + "\r\nexit\r\n");
        });
      })
      .on("error", (err) => reject(err))
      .connect({
        host: env.sage.appServerHost,
        port: env.sage.appServerPort,
        username: env.sage.appServerUsername,
        password: env.sage.appServerPassword,
        readyTimeout: 15_000,
      });
  });
}

async function grantSqlAccess(adUsername: string, sageDatabaseName: string): Promise<SageStepResult> {
  if (!env.sage.sqlServerHost || !env.sage.sqlServerUsername) {
    return { ok: false, message: "SAGE_SQL_HOST/SAGE_SQL_USERNAME non configurés" };
  }

  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await new sql.ConnectionPool({
      server: env.sage.sqlServerHost,
      port: env.sage.sqlServerPort,
      user: env.sage.sqlServerUsername,
      password: env.sage.sqlServerPassword,
      database: "master",
      options: { trustServerCertificate: true, encrypt: true },
      connectionTimeout: 15_000,
    }).connect();

    const escapedLogin = adUsername.replace(/]/g, "]]");
    const escapedDb = sageDatabaseName.replace(/]/g, "]]");

    await pool.request().batch(`
      IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'${adUsername.replace(/'/g, "''")}')
      BEGIN
        CREATE LOGIN [${escapedLogin}] FROM WINDOWS;
      END
    `);

    const roleStatements = env.sage.sqlRoles
      .map(
        (role) => `
      IF NOT EXISTS (
        SELECT 1 FROM sys.database_role_members drm
        JOIN sys.database_principals p ON drm.member_principal_id = p.principal_id
        JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
        WHERE p.name = N'${adUsername.replace(/'/g, "''")}' AND r.name = N'${role.replace(/'/g, "''")}'
      )
      BEGIN
        ALTER ROLE [${role.replace(/]/g, "]]")}] ADD MEMBER [${escapedLogin}];
      END
    `
      )
      .join("\n");

    await pool.request().batch(`
      USE [${escapedDb}];
      IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'${adUsername.replace(/'/g, "''")}')
      BEGIN
        CREATE USER [${escapedLogin}] FOR LOGIN [${escapedLogin}];
      END
      ${roleStatements}
    `);

    return { ok: true, message: "OK" };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  } finally {
    await pool?.close().catch(() => undefined);
  }
}

export async function runSageAccessAutomation(params: {
  adUsername: string;
  sageDatabaseName: string;
}): Promise<SageAutomationResult> {
  const [appResult, sqlResult] = await Promise.all([
    runOnAppServer(params.adUsername, params.sageDatabaseName).catch((err) => ({
      rdp: { ok: false, message: err instanceof Error ? err.message : String(err) },
      files: { ok: false, message: err instanceof Error ? err.message : String(err) },
    })),
    grantSqlAccess(params.adUsername, params.sageDatabaseName),
  ]);

  return { rdp: appResult.rdp, files: appResult.files, sql: sqlResult };
}
