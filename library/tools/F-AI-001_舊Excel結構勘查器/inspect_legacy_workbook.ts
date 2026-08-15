import * as path from 'path';
import * as fs from 'fs';
import { cellAddress, columnNumberToName, readOoxmlWorkbook } from '../apps/server/src/services/ooxmlWorkbook.js';

const WORKBOOK_PATH = path.resolve('D:/範例單據/範例年度物資領據 (示範服務中心).xlsm');
const OUTPUT_DIR = path.resolve('D:/物資填報單據/receipt-system/docs');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'legacy_excel_findings.md');

async function run() {
  console.log(`Loading workbook from: ${WORKBOOK_PATH}`);
  if (!fs.existsSync(WORKBOOK_PATH)) {
    console.error('Workbook file not found!');
    process.exit(1);
  }

  const workbook = await readOoxmlWorkbook(WORKBOOK_PATH);

  console.log('Workbook loaded successfully.');
  console.log('Sheet Names:', workbook.sheetNames);

  const findings: string[] = [];
  findings.push('# Legacy Excel Findings\n');
  findings.push('> Generated with the project OOXML reader. The reader inspects workbook XML values and formulas without loading the legacy VBA project into application memory.\n');

  findings.push('## Workbook Summary\n');
  findings.push('- **File Path**: `範例年度物資領據 (示範服務中心).xlsm`');
  findings.push(`- **Number of Sheets**: ${workbook.sheetNames.length}`);
  findings.push(`- **VBA Project**: ${workbook.hasMacroProject ? 'Yes (xl/vbaProject.bin present)' : 'No VBA binary found'}\n`);

  findings.push('## Sheet Inventory\n');
  findings.push('| Sheet Name | Max Row (1-indexed) | Max Column (1-indexed) | Cell Count | Formula Count |');
  findings.push('|---|---|---|---|---|');

  const sheetStats: Record<string, { maxRow: number; maxCol: number; cellCount: number; formulaCount: number }> = {};
  for (const sheet of workbook.worksheets) {
    let formulaCount = 0;
    for (const cell of sheet.cells.values()) {
      if (cell.formula) formulaCount++;
    }

    sheetStats[sheet.name] = {
      maxRow: sheet.rowCount,
      maxCol: sheet.columnCount,
      cellCount: sheet.cells.size,
      formulaCount
    };
    findings.push(`| ${sheet.name} | ${sheet.rowCount} | ${sheet.columnCount} | ${sheet.cells.size} | ${formulaCount} |`);
  }
  findings.push('');

  findings.push('## Named Ranges And Formulas\n');
  if (workbook.definedNames.length > 0) {
    findings.push('| Name | Refers To |');
    findings.push('|---|---|');
    for (const definedName of workbook.definedNames) {
      findings.push(`| ${definedName.name} | \`${definedName.ranges.join(', ')}\` |`);
    }
  } else {
    findings.push('No named ranges found through workbook metadata.');
  }
  findings.push('\n');

  findings.push('## Primary Input Sheet\n');
  const inputSheetName = '發送清單 (先填此) ';
  const inputSheet = workbook.getWorksheet(inputSheetName);

  if (inputSheet) {
    const stats = sheetStats[inputSheetName];
    findings.push(`- **Sheet Name**: \`${inputSheetName}\``);
    findings.push(`- **Range Approximation**: \`A1:${columnNumberToName(inputSheet.columnCount)}${inputSheet.rowCount}\``);
    findings.push(`- **Total Cells**: ${stats.cellCount}`);
    findings.push(`- **Formula Cells**: ${stats.formulaCount}\n`);

    findings.push('### Columns Layout (Row 3 / 4 / 5 Headers)\n');
    findings.push('| Col | Col Name (Row 4) | Col Name (Row 5) | Type/Role |');
    findings.push('|---|---|---|---|');
    for (let col = 1; col <= inputSheet.columnCount; col++) {
      const colLetter = columnNumberToName(col);
      const row3 = inputSheet.getCellTextByRowCol(3, col);
      const row4 = inputSheet.getCellTextByRowCol(4, col);
      const row5 = inputSheet.getCellTextByRowCol(5, col);
      const cellVal = row3 || row4 || row5 || '';
      if (cellVal) {
        let role = 'Data Field';
        const zeroBasedCol = col - 1;
        if (zeroBasedCol >= 20 && zeroBasedCol <= 55) {
          const itemNum = Math.floor((zeroBasedCol - 20) / 2) + 1;
          const isQty = (zeroBasedCol - 20) % 2 === 1;
          role = `Distribution Item ${itemNum} ${isQty ? 'Quantity' : 'Name'}`;
        }
        findings.push(`| ${colLetter} | ${row4} | ${row5} | ${role} |`);
      }
    }
    findings.push('\n');

    let dataRowCount = 0;
    let totalDetailCount = 0;
    let incompleteDetails = 0;
    const itemVariants = new Set<string>();

    for (let rowNum = 3; rowNum <= inputSheet.rowCount; rowNum++) {
      const name = inputSheet.getCellTextByRowCol(rowNum, 2);
      if (!name) continue;

      dataRowCount++;
      for (let itemIdx = 0; itemIdx < 18; itemIdx++) {
        const itemVal = inputSheet.getCellTextByRowCol(rowNum, 21 + itemIdx * 2);
        const qtyVal = inputSheet.getCellTextByRowCol(rowNum, 22 + itemIdx * 2);

        if (itemVal || qtyVal) {
          totalDetailCount++;
          if (!itemVal || !qtyVal) incompleteDetails++;
          if (itemVal) itemVariants.add(itemVal);
        }
      }
    }

    findings.push('### Count Reconciliation\n');
    findings.push(`- **Recipient Data Rows (Non-empty Name)**: ${dataRowCount}`);
    findings.push(`- **Total Distribution Detail Cells (Item or Qty filled)**: ${totalDetailCount}`);
    findings.push(`- **Incomplete Distribution Lines (Only Item or Only Qty)**: ${incompleteDetails}`);
    findings.push(`- **Unique Material Name Variants**: ${itemVariants.size}\n`);
  } else {
    findings.push(`**Error**: Primary input sheet \`${inputSheetName}\` not found.\n`);
  }

  findings.push('## Receipt Print Sheet\n');
  const printSheetName = '套印簽收單 ( 再選案主)';
  const printSheet = workbook.getWorksheet(printSheetName);
  if (printSheet) {
    findings.push(`- **Sheet Name**: \`${printSheetName}\``);
    findings.push(`- **Range Approximation**: \`A1:${columnNumberToName(printSheet.columnCount)}${printSheet.rowCount}\`\n`);

    findings.push('### Static Text and Formulas mapping\n');
    findings.push('| Cell | Label/Role | Formula / Static Value |');
    findings.push('|---|---|---|');

    const keyCells = ['C5', 'C7', 'C11', 'I11', 'C12', 'I12', 'C28', 'I28'];
    for (const address of keyCells) {
      const cell = printSheet.getCell(address);
      if (cell?.value || cell?.formula) {
        findings.push(`| ${address} | ${printSheet.getCellText(address)} | \`${cell.formula || ''}\` |`);
      }
    }
    findings.push('\n');
  } else {
    findings.push(`**Error**: Print sheet \`${printSheetName}\` not found.\n`);
  }

  findings.push('## Data Validation Risks\n');
  findings.push('Checking visible cell values and formulas for `#REF!` risks...\n');
  let hasRefError = false;
  for (const sheet of workbook.worksheets) {
    for (const cell of sheet.cells.values()) {
      const value = cell.value === undefined || cell.value === null ? '' : String(cell.value);
      const formula = cell.formula || '';
      if (value.includes('#REF!')) {
        findings.push(`- **Cell ${sheet.name}!${cellAddress(cell.row, cell.col)}** contains \`#REF!\` error value.`);
        hasRefError = true;
      }
      if (formula.includes('#REF!')) {
        findings.push(`- **Formula in ${sheet.name}!${cellAddress(cell.row, cell.col)}** contains \`#REF!\` reference error.`);
        hasRefError = true;
      }
    }
  }
  if (!hasRefError) {
    findings.push('- No `#REF!` formula or cell value errors detected in the workbook.\n');
  }

  findings.push('## Migration Risks\n');
  findings.push('- **Name as Primary Key**: The legacy sheet uses lookup behavior based on recipient name, which fails when names are duplicated.');
  findings.push('- **Quantity Units**: Quantities are mixed text like "1包", "2組", which must be normalized into numerical fields and unit fields.');
  findings.push('- **Blank cells**: Large number of blank rows and columns in grid layout must be cleanly ignored.');
  findings.push('- **Macro inspection**: The OOXML reader detects the VBA binary presence but does not execute or inspect macro code.\n');

  findings.push('## Open Questions For Codex\n');
  findings.push('1. Can the detected material names be merged into a standardized items master list?');
  findings.push('2. Are hidden or backup sheets such as `發送清單 (先填此)  (2)` part of the migration scope, or archival only?\n');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, findings.join('\n'), 'utf8');
  console.log(`Findings written to: ${OUTPUT_FILE}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
