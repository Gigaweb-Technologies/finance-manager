import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authenticateToken } from '@/lib/auth';
import pdf from 'pdf-parse';
import { normalizeSenderName, generateDeterministicId } from '@/lib/statement-processor';

export async function POST(request) {
    const user = authenticateToken(request);
    if (!user) return NextResponse.json({ error: 'Access denied' }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get('statement');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const data = await pdf(buffer);
        const text = data.text;

        const lines = text.split('\n');
        const extractedTransactions = [];

        const dateRegex = /\d{4}-\d{2}-\d{2}|\d{1,2}[-/][A-Za-z]{3}[-/](?:19|20)\d{2}|\d{1,2}[-/][A-Za-z]{3}[-/]\d{2}|\d{1,2}[-/]\d{1,2}[-/](?:19|20)\d{2}/;
        const dateRegexGlobal = new RegExp(dateRegex.source, 'g');
        const amountRegex = /(\d{1,3}(,\d{3})*|\d+)\.\d{2}/g;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const dateMatch = line.match(dateRegex);
            if (dateMatch) {
                let currentDate = dateMatch[0];
                let currentNarration = '';
                let amount_naira = 0;
                let isCredit = false;

                const allDates = line.match(dateRegexGlobal);
                const allAmounts = line.match(amountRegex);

                if (allDates && allDates.length >= 2 && line.startsWith(allDates[0])) {
                    currentNarration = line.substring(allDates[0].length + allDates[1].length).trim();
                } else {
                    currentNarration = line.replace(dateRegexGlobal, ' ').trim();
                }

                if (allDates && allAmounts && allAmounts.length >= 2) {
                    const deposit = parseFloat(allAmounts[0].replace(/,/g, ''));
                    const withdrawal = parseFloat(allAmounts[1].replace(/,/g, ''));

                    if (withdrawal === 0 && deposit > 0) {
                        isCredit = true;
                        amount_naira = deposit;
                    } else if (allAmounts.length === 3 && parseFloat(allAmounts[1].replace(/,/g, '')) === 0) {
                        isCredit = true;
                        amount_naira = parseFloat(allAmounts[0].replace(/,/g, ''));
                    }

                    const cn = currentNarration.toUpperCase();
                    const isBankCharge = cn.includes('LEVY') || cn.includes('VAT') || cn.includes('CHARGE') || cn.includes('STAMP') || cn.includes('TAX') || cn.includes('SMS ALERT');

                    if (isCredit && !isBankCharge) {
                        const lastDateIndex = line.lastIndexOf(allDates[allDates.length - 1]);
                        const firstAmountIndex = line.indexOf(allAmounts[0]);
                        currentNarration = line.substring(lastDateIndex + allDates[allDates.length - 1].length, firstAmountIndex).trim();
                        currentNarration = currentNarration.replace(/^\d+/, '').trim();

                        const transaction = {
                            date: currentDate,
                            amount_naira: amount_naira,
                            narration: currentNarration,
                            sender: normalizeSenderName(currentNarration),
                            type: 'IN'
                        };
                        transaction.transaction_unique_id = generateDeterministicId(transaction);
                        extractedTransactions.push(transaction);
                    }
                } else {
                    let foundAmount = false;
                    let j = i + 1;
                    while (j < lines.length && j < i + 10 && !foundAmount) {
                        const nextLine = lines[j].trim();
                        if (!nextLine) { j++; continue; }
                        const cleanNextLine = nextLine.replace(dateRegexGlobal, ' ').trim();
                        const amounts = cleanNextLine.match(amountRegex);
                        if (amounts && amounts.length >= 1) {
                            let narrationPart = cleanNextLine;
                            amounts.forEach(amt => narrationPart = narrationPart.replace(amt, ' '));
                            currentNarration += ' ' + narrationPart.trim();

                            const cn = currentNarration.toUpperCase();
                            const potentialCredit = cn.includes('FROM') || cn.includes('INFLOW') || cn.includes('CREDIT') || cn.includes('TRANSFER') || cn.includes('TRF');
                            const isDebit = (cn.includes(' TO ') && !cn.includes('TO BLAZER')) || cn.includes('DEBIT') || cn.includes('FEE') || cn.includes('LEVY') || cn.includes('VAT') || cn.includes('CHARGE') || cn.includes('STAMP') || cn.includes('TAX') || cn.includes('SMS ALERT');

                            if (potentialCredit && !isDebit) {
                                const val = parseFloat(amounts[0].replace(/,/g, ''));
                                if (val > 0) {
                                    const transaction = {
                                        date: currentDate,
                                        amount_naira: val,
                                        narration: currentNarration,
                                        sender: normalizeSenderName(currentNarration),
                                        type: 'IN'
                                    };
                                    transaction.transaction_unique_id = generateDeterministicId(transaction);
                                    extractedTransactions.push(transaction);
                                }
                            }
                            foundAmount = true;
                            i = j;
                        } else {
                            if (nextLine.match(dateRegex) && currentNarration.length > 20) break;
                            currentNarration += ' ' + nextLine.replace(dateRegexGlobal, ' ').trim();
                            j++;
                        }
                    }
                }
            }
        }

        return NextResponse.json(extractedTransactions);
    } catch (err) {
        console.error('Error parsing PDF:', err);
        return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 });
    }
}
