export interface BankTransaction {
  realtime: string;
  bookingDate: string;
  valuationDate: string;
  bookingText: string;
  internalNote: string;
  currency: string;
  amount: number;
  documentData: string;
  documentNumber: string;
  payerName: string;
  payerAccount: string;
  payerBLZ: string;
  payeeName: string;
  payeeAccount: string;
  payeeBLZ: string;
  paymentReason: string;
  paymentReference: string;
}

/**
 * Parse a semicolon‑separated CSV file (UTF‑8) into an array of BankTransaction objects.
 * Returns an empty array on failure and logs errors to console.
 */
export function parseBankCsv(file: File): Promise<BankTransaction[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      // Split into rows, handling CRLF/LF
      const rows = text.split(/\r?\n/).filter((r) => r.trim().length > 0);
      if (rows.length === 0) {
        resolve([]);
        return;
      }
      const header = rows[0].split(';').map((h) => h.trim());
      const data: BankTransaction[] = [];
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(';');
        if (cols.length !== header.length) continue; // skip malformed rows
        const obj: any = {};
        header.forEach((key, idx) => {
          const val = cols[idx].trim();
          // Convert amount to number, handling commas as decimal separator
          if (key.toLowerCase() === 'betrag') {
            const num = parseFloat(val.replace(',', '.'));
            obj.amount = isNaN(num) ? 0 : num;
          } else {
            obj[key] = val;
          }
        });
        // Map explicit field names (German) to interface keys
        const mapped: BankTransaction = {
          realtime: obj['Echtzeit'] ?? '',
          bookingDate: obj['Buchungsdatum'] ?? '',
          valuationDate: obj['Valutadatum'] ?? '',
          bookingText: obj['Buchungstext'] ?? '',
          internalNote: obj['Interne Notiz'] ?? '',
          currency: obj['Währung'] ?? '',
          amount: obj.amount ?? 0,
          documentData: obj['Belegdaten'] ?? '',
          documentNumber: obj['Belegnummer'] ?? '',
          payerName: obj['Auftraggebername'] ?? '',
          payerAccount: obj['Auftraggeberkonto'] ?? '',
          payerBLZ: obj['Auftraggeber BLZ'] ?? '',
          payeeName: obj['Empfängername'] ?? '',
          payeeAccount: obj['Empfängerkonto'] ?? '',
          payeeBLZ: obj['Empfänger BLZ'] ?? '',
          paymentReason: obj['Zahlungsgrund'] ?? '',
          paymentReference: obj['Zahlungsreferenz'] ?? '',
        };
        data.push(mapped);
      }
      resolve(data);
    };
    reader.onerror = () => resolve([]);
    reader.readAsText(file);
  });
}
