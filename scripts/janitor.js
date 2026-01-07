import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const reportFile = path.join(rootDir, 'SYSTEM_HEALTH.md');

// 1. Get List of Files
function getFiles(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(file));
        } else {
            if (file.match(/\.(ts|tsx|js|jsx)$/)) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = getFiles(srcDir);
const reportMap = new Map();

// 2. Scan Files for LOC and TODOs
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const loc = lines.length;
    // Count TODOs (case insensitive)
    const todos = (content.match(/\/\/.*TODO/gi) || []).length;
    // Normalize path to forward slashes for consistency
    const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
    
    reportMap.set(relativePath, {
        path: relativePath,
        loc,
        todos,
        issues: []
    });
});

// 3. Run Dependency Cruiser
console.log('Running Dependency Cruiser...');
let cruiserResults = { summary: { violations: [] } };
try {
    // Run depcruise and capture output.
    // npx is needed if not in path, but usually accessible via npm scripts environment.
    // We use relative path for config.
    const output = execSync('npx depcruise src --config .dependency-cruiser.cjs --output-type json', { 
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'] // ignore stderr to keep console clean? or pipe it.
    });
    cruiserResults = JSON.parse(output);
} catch (error) {
    // depcruise returns exit code > 0 on violations, so execSync will throw.
    // We catch it and try to parse the stdout which is contained in error.stdout
    if (error.stdout) {
        try {
            cruiserResults = JSON.parse(error.stdout.toString());
        } catch (e) {
            console.error("Failed to parse dependency-cruiser output:", e);
        }
    } else {
        console.error("Dependency Cruiser failed:", error);
    }
}

// 4. Process Violations
let architecturalSmellsCount = 0;

if (cruiserResults.summary && cruiserResults.summary.violations) {
    cruiserResults.summary.violations.forEach(violation => {
        // violation.from and violation.to are paths
        const fromPath = violation.from;
        const toPath = violation.to;
        
        if (reportMap.has(fromPath)) {
            const entry = reportMap.get(fromPath);
            entry.issues.push(`Imports ${toPath} (Spaghetti!)`);
            architecturalSmellsCount++;
        }
    });
}

// 5. Generate Report
const reportData = Array.from(reportMap.values());
// Sort by LOC desc
reportData.sort((a, b) => b.loc - a.loc);

let md = '# 🧹 System Health Report\n\n';
md += `**Generated:** ${new Date().toLocaleString()}\n`;
md += `**Total Source Files:** ${reportData.length}\n`;
if (architecturalSmellsCount > 0) {
    md += `\n🚨 **ARCHITECTURAL SMELLS DETECTED:** ${architecturalSmellsCount}\n`;
}
md += '\n### Legend\n';
md += '- 🟢 Healthy (< 200 LOC)\n';
md += '- 🟡 Warning (> 200 LOC)\n';
md += '- 🔴 Critical (> 300 LOC)\n\n';
md += '| File | LOC | Status | Issues |\n';
md += '| :--- | :---: | :---: | :--- |\n';

reportData.forEach(item => {
    let icon = '🟢';
    let status = 'HEALTHY';
    if (item.loc > 200) { icon = '🟡'; status = 'WARNING'; } 
    if (item.loc > 300) { icon = '🔴'; status = 'CRITICAL'; } 
    
    // Add TODO info to issues
    if (item.todos > 0) {
        item.issues.push(`${item.todos} TODOs`);
    }
    
    // Format issues string
    const issuesStr = item.issues.join(', ');
    
    // Force RED icon if there are architectural issues? 
    // Instructions implied adding specific text, but let's stick to LOC-based status + Issues column.
    
    md += '| `' + item.path + '` | ' + item.loc + ' | ' + icon + ' ' + status + ' | ' + issuesStr + ' |\n';
});

fs.writeFileSync(reportFile, md);
console.log('Janitor has finished cleaning. Report saved to SYSTEM_HEALTH.md');
