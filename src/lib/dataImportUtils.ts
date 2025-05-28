import Papa from "papaparse";
import ExcelJS from "exceljs";

export async function processCsvFile(file: File, setProgress: (v: number) => void) {
    return new Promise<any[][]>((resolve) => {
        Papa.parse(file, {
            complete: (result) => {
                setProgress(100);
                resolve(result.data as any[][]);
            },
            // Remove 'step' as setProgress may not work as expected with prev in this context
        });
    });
}

export async function processExcelFile(file: File, setProgress: (v: number) => void) {
    setProgress(20);
    const reader = new FileReader();
    return new Promise<any[][]>((resolve) => {
        reader.onload = async (evt) => {
            setProgress(60);
            const buffer = evt.target?.result;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer as ArrayBuffer);
            setProgress(80);
            const worksheet = workbook.worksheets[0];
            // Convert worksheet to 2D array
            const data: any[][] = [];
            worksheet.eachRow({ includeEmpty: true }, (row) => {
                const arr = Array.isArray(row.values) ? row.values.slice(1) : [];
                data.push(arr);
            });
            // Handle merged cells: ExcelJS exposes merges as worksheet['model'].merges
            const merges = worksheet['model']?.merges;
            if (Array.isArray(merges)) {
                for (const merge of merges) {
                    // merge is a range string like 'A1:B2'
                    const match = typeof merge === 'string' && merge.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
                    if (!match) continue;
                    const [, startCol, startRow, endCol, endRow] = match;
                    const colToIdx = (col: string) => col.split('').reduce((r, c) => r * 26 + c.charCodeAt(0) - 64, 0) - 1;
                    const sRow = parseInt(startRow, 10) - 1;
                    const eRow = parseInt(endRow, 10) - 1;
                    const sCol = colToIdx(startCol);
                    const eCol = colToIdx(endCol);
                    const val = data[sRow]?.[sCol];
                    for (let r = sRow; r <= eRow; r++) {
                        for (let c = sCol; c <= eCol; c++) {
                            if (r !== sRow || c !== sCol) {
                                if (!data[r]) data[r] = [];
                                data[r][c] = val;
                            }
                        }
                    }
                }
            }
            setProgress(100);
            resolve(data);
        };
        reader.readAsArrayBuffer(file);
    });
}
