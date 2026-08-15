import * as yauzl from 'yauzl';
import { XMLParser } from 'fast-xml-parser';

export interface OoxmlCell {
  address: string;
  row: number;
  col: number;
  value: string | number | boolean | null;
  formula?: string;
}

export interface OoxmlWorksheet {
  name: string;
  rowCount: number;
  columnCount: number;
  cells: Map<string, OoxmlCell>;
  getCell(address: string): OoxmlCell | undefined;
  getCellByRowCol(row: number, col: number): OoxmlCell | undefined;
  getCellText(address: string): string;
  getCellTextByRowCol(row: number, col: number): string;
}

export interface OoxmlWorkbook {
  sheetNames: string[];
  worksheets: OoxmlWorksheet[];
  definedNames: Array<{ name: string; ranges: string[] }>;
  hasMacroProject: boolean;
  getWorksheet(name: string): OoxmlWorksheet | undefined;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function nodeText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(nodeText).join('');
  }
  if (typeof value === 'object' && '#text' in value) {
    return String((value as { '#text'?: unknown })['#text'] ?? '');
  }
  return '';
}

function richText(value: any): string {
  if (!value) return '';
  if (value.t !== undefined) return nodeText(value.t);
  if (value.r !== undefined) {
    return asArray(value.r).map((run: any) => nodeText(run.t)).join('');
  }
  return nodeText(value);
}

export function columnNumberToName(col: number): string {
  let n = col;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function cellAddress(row: number, col: number): string {
  return `${columnNumberToName(col)}${row}`;
}

function decodeCellAddress(address: string): { row: number; col: number } {
  const match = address.match(/^([A-Z]+)([0-9]+)$/i);
  if (!match) return { row: 0, col: 0 };

  const letters = match[1].toUpperCase();
  let col = 0;
  for (const letter of letters) {
    col = col * 26 + (letter.charCodeAt(0) - 64);
  }

  return { row: Number(match[2]), col };
}

function decodeDimension(ref: string | undefined): { row: number; col: number } {
  if (!ref) return { row: 0, col: 0 };
  const lastAddress = ref.split(':').pop() || ref;
  return decodeCellAddress(lastAddress);
}

function normalizeZipPath(target: string): string {
  const clean = target.replace(/\\/g, '/');
  if (clean.startsWith('/')) return clean.slice(1);
  return `xl/${clean}`.replace(/\/+/g, '/');
}

async function readZipEntries(filePath: string): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (openErr, zipfile) => {
      if (openErr) {
        reject(openErr);
        return;
      }
      if (!zipfile) {
        reject(new Error('Unable to open OOXML zip container.'));
        return;
      }

      const entries = new Map<string, Buffer>();

      zipfile.on('entry', (entry) => {
        if (entry.fileName.endsWith('/')) {
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(entry, (streamErr, stream) => {
          if (streamErr) {
            zipfile.close();
            reject(streamErr);
            return;
          }
          if (!stream) {
            zipfile.readEntry();
            return;
          }

          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          stream.on('end', () => {
            entries.set(entry.fileName, Buffer.concat(chunks));
            zipfile.readEntry();
          });
          stream.on('error', (err) => {
            zipfile.close();
            reject(err);
          });
        });
      });

      zipfile.on('end', () => resolve(entries));
      zipfile.on('error', reject);
      zipfile.readEntry();
    });
  });
}

function parseXml(entries: Map<string, Buffer>, fileName: string): any | null {
  const buffer = entries.get(fileName);
  if (!buffer) return null;
  return parser.parse(buffer.toString('utf8'));
}

function readSharedStrings(entries: Map<string, Buffer>): string[] {
  const shared = parseXml(entries, 'xl/sharedStrings.xml');
  const items = asArray(shared?.sst?.si);
  return items.map(richText);
}

function readRelationships(entries: Map<string, Buffer>): Map<string, string> {
  const relXml = parseXml(entries, 'xl/_rels/workbook.xml.rels');
  const relationships = asArray(relXml?.Relationships?.Relationship);
  const result = new Map<string, string>();
  for (const rel of relationships as any[]) {
    if (rel.Id && rel.Target) {
      result.set(String(rel.Id), normalizeZipPath(String(rel.Target)));
    }
  }
  return result;
}

function parseCellValue(cell: any, sharedStrings: string[]): OoxmlCell['value'] {
  const type = cell.t ? String(cell.t) : '';
  const raw = nodeText(cell.v).trim();

  if (type === 's') {
    return sharedStrings[Number(raw)] ?? '';
  }
  if (type === 'inlineStr') {
    return richText(cell.is);
  }
  if (type === 'b') {
    return raw === '1';
  }
  if (!raw) {
    return '';
  }
  if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(raw)) {
    return Number(raw);
  }
  return raw;
}

function readWorksheet(name: string, xml: any, sharedStrings: string[]): OoxmlWorksheet {
  const cells = new Map<string, OoxmlCell>();
  const rows = asArray(xml?.worksheet?.sheetData?.row);
  const dimension = decodeDimension(xml?.worksheet?.dimension?.ref);
  let rowCount = dimension.row;
  let columnCount = dimension.col;

  for (const row of rows as any[]) {
    for (const rawCell of asArray(row.c) as any[]) {
      const address = rawCell.r ? String(rawCell.r) : '';
      if (!address) continue;

      const decoded = decodeCellAddress(address);
      rowCount = Math.max(rowCount, decoded.row);
      columnCount = Math.max(columnCount, decoded.col);

      const formula = rawCell.f !== undefined ? nodeText(rawCell.f).trim() : undefined;
      cells.set(address.toUpperCase(), {
        address: address.toUpperCase(),
        row: decoded.row,
        col: decoded.col,
        value: parseCellValue(rawCell, sharedStrings),
        formula: formula || undefined
      });
    }
  }

  const worksheet: OoxmlWorksheet = {
    name,
    rowCount,
    columnCount,
    cells,
    getCell(address: string) {
      return cells.get(address.toUpperCase());
    },
    getCellByRowCol(row: number, col: number) {
      return cells.get(cellAddress(row, col));
    },
    getCellText(address: string) {
      const value = cells.get(address.toUpperCase())?.value;
      return value === undefined || value === null ? '' : String(value).trim();
    },
    getCellTextByRowCol(row: number, col: number) {
      const value = cells.get(cellAddress(row, col))?.value;
      return value === undefined || value === null ? '' : String(value).trim();
    }
  };

  return worksheet;
}

export async function readOoxmlWorkbook(filePath: string): Promise<OoxmlWorkbook> {
  const entries = await readZipEntries(filePath);
  const workbookXml = parseXml(entries, 'xl/workbook.xml');
  if (!workbookXml?.workbook) {
    throw new Error('Invalid OOXML workbook: missing xl/workbook.xml');
  }

  const sharedStrings = readSharedStrings(entries);
  const rels = readRelationships(entries);
  const workbookSheets = asArray(workbookXml.workbook.sheets?.sheet);
  const worksheets: OoxmlWorksheet[] = [];

  for (const sheetNode of workbookSheets as any[]) {
    const relId = sheetNode['r:id'];
    const target = relId ? rels.get(String(relId)) : undefined;
    if (!target) continue;

    const sheetXml = parseXml(entries, target);
    if (!sheetXml) continue;
    worksheets.push(readWorksheet(String(sheetNode.name), sheetXml, sharedStrings));
  }

  const definedNames = asArray(workbookXml.workbook.definedNames?.definedName).map((node: any) => ({
    name: String(node.name || ''),
    ranges: [nodeText(node).trim()].filter(Boolean)
  }));

  const workbook: OoxmlWorkbook = {
    sheetNames: worksheets.map((sheet) => sheet.name),
    worksheets,
    definedNames,
    hasMacroProject: entries.has('xl/vbaProject.bin'),
    getWorksheet(name: string) {
      return worksheets.find((sheet) => sheet.name === name);
    }
  };

  return workbook;
}
