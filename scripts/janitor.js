import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const reportFile = path.join(rootDir, 'SYSTEM_HEALTH.md');

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
const reportData = [];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const loc = lines.length;
    // Count TODOs (case insensitive)
    const todos = (content.match(/\/\/.*TODO/gi) || []).length;
    const relativePath = path.relative(srcDir, file).replace(/\\/g, '/');
    const warnings = [];

    // System-to-System Check
    // "If a file in src/systems/ imports from another file in src/systems/"
    if (relativePath.startsWith('systems/')) {
        lines.forEach(line => {
            // Basic import check
            const importMatch = line.match(/^import .* from [\'\"](.+)[\'\"];?/);
            if (importMatch) {
                const importPath = importMatch[1];
                
                // Spaghetti Logic:
                // 1. Importing a sibling file that looks like a System (ends in 'System')
                // 2. Importing from 'systems/' path explicitly
                // We exclude 'ISystem' interface usually, and non-system files
                
                // Check if import path contains 'systems/' or matches './SomeSystem'
                if (
                    (importPath.startsWith('./') && importPath.endsWith('System') && !importPath.includes('ISystem') && !importPath.includes('SystemManager')) ||
                    (importPath.includes('/systems/') && !importPath.includes('ISystem'))
                ) {
                   warnings.push(importPath);
                }
            }
        });
    }

    reportData.push({ path: relativePath, loc, todos, warnings });
});

// Sort by LOC desc
reportData.sort((a, b) => b.loc - a.loc);

let md = '# 🧹 System Health Report\n\n';
md += `**Generated:** ${new Date().toLocaleString()}\n`;
md += `**Total Source Files:** ${reportData.length}\n\n`;
md += '### Legend\n';
md += '- 🟢 Healthy (< 200 LOC)\n';
md += '- 🟡 Warning (> 200 LOC)\n';
md += '- 🔴 Critical (> 300 LOC)\n\n';
md += '| Status | File | LOC | TODOs | Warnings |\n';
md += '| :---: | :--- | :---: | :---: | :--- |\n';

reportData.forEach(item => {
    let icon = '🟢';
    if (item.loc > 200) icon = '🟡';
    if (item.loc > 300) icon = '🔴';
    
    let warningStr = '';
    if (item.warnings.length > 0) {
        warningStr = `⚠️ **Spaghetti:** Imports ${item.warnings.map(w => `\`${w}\``).join(', ')}`;
    }
    
    md += '| ' + icon + ' | `' + item.path + '` | ' + item.loc + ' | ' + item.todos + ' | ' + warningStr + ' |\n';
});

fs.writeFileSync(reportFile, md);
console.log('Janitor has finished cleaning. Report saved to SYSTEM_HEALTH.md');