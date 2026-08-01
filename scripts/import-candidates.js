const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const csvPath = path.join(__dirname, '..', 'data', 'candidates.csv');

function parseCsvLine(line) {
    const fields = [];
    let field = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];

        if (character === '"') {
            if (quoted && line[index + 1] === '"') {
                field += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (character === ',' && !quoted) {
            fields.push(field.trim());
            field = '';
        } else {
            field += character;
        }
    }

    fields.push(field.trim());
    return fields;
}

function parseCsv(contents) {
    const lines = contents.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
    if (lines.length === 0) {
        return [];
    }

    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map((line, index) => {
        const values = parseCsvLine(line);
        return {
            lineNumber: index + 2,
            row: Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] || ''])),
        };
    });
}

async function importCandidate(row) {
    const name = row.Name.trim();
    const email = row.email.trim().toLowerCase();
    const candidateCode = row['User Name'].trim().toUpperCase();
    const password = row.Password.trim();

    if (!name || !email || !candidateCode || !password) {
        throw new Error('missing required CSV value');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        console.log(`Skipped ${name} (${email}): duplicate email`);
        return 'skipped';
    }

    const existingCandidate = await prisma.candidate.findUnique({ where: { candidate_code: candidateCode } });
    if (existingCandidate) {
        console.log(`Skipped ${name} (${candidateCode}): duplicate candidate code`);
        return 'skipped';
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await prisma.$transaction(async (transaction) => {
            const user = await transaction.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: 'CANDIDATE',
                    isVerified: true,
                    verificationToken: null,
                    verificationTokenExpiry: null,
                },
            });

            await transaction.candidate.create({
                data: {
                    candidate_code: candidateCode,
                    name,
                    userId: user.id,
                },
            });
        });
    } catch (error) {
        if (error?.code === 'P2002') {
            const duplicateUser = await prisma.user.findUnique({ where: { email } });
            if (duplicateUser) {
                console.log(`Skipped ${name} (${email}): duplicate email`);
            } else {
                console.log(`Skipped ${name} (${candidateCode}): duplicate candidate code`);
            }
            return 'skipped';
        }
        throw error;
    }

    return 'imported';
}

async function main() {
    const contents = await fs.readFile(csvPath, 'utf8');
    const rows = parseCsv(contents);
    const summary = { imported: 0, skipped: 0, failed: 0 };

    for (const { lineNumber, row } of rows) {
        try {
            const result = await importCandidate(row);
            summary[result] += 1;
        } catch (error) {
            summary.failed += 1;
            console.error(`Failed line ${lineNumber}: ${error.message}`);
        }
    }

    console.log(`Imported: ${summary.imported}`);
    console.log(`Skipped: ${summary.skipped}`);
    console.log(`Failed: ${summary.failed}`);
}

main()
    .catch((error) => {
        console.error('Candidate import failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });