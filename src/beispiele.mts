/* eslint-disable n/no-process-env */
// Copyright (C) 2025 - present Dein Name
//
// Dieses Beispielskript zeigt, wie man mit Prisma auf die DB "fussballverein"
// zugreifen kann. Es orientiert sich am alten "buch"-Beispiel, aber nutzt
// die neuen Tabellen: fussballverein, stadion, spieler.

import { PrismaPg } from '@prisma/adapter-pg';
import process from 'node:process';
import {
    PrismaClient,
    type Fussballverein,
    type Prisma,
} from './generated/prisma/client.ts';

console.log(`process.env['DATABASE_URL']=${process.env['DATABASE_URL']}`);
console.log('');

// PrismaClient für DB "fussballverein"
const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'],
});
const prisma = new PrismaClient({
    adapter,
    errorFormat: 'pretty',
    log: [{ emit: 'event', level: 'query' }, 'info', 'warn', 'error'],
});

prisma.$on('query', (e) => {
    console.log(`Query: ${e.query}`);
    console.log(`Duration: ${e.duration} ms`);
});

// Beispiel-Query: Alle Vereine mit Stadion + Spielern
export type VereinMitStadionUndSpielern = Prisma.FussballvereinGetPayload<{
    include: {
        stadion: true;
        spieler: true;
    };
}>;

try {
    await prisma.$connect();

    // 1. Ein bestimmter Verein nach ID
    const bayern: Fussballverein | null =
        await prisma.fussballverein.findUnique({
            where: { id: 1000 }, // Beispiel-ID
        });
    console.log(`fussballverein=${JSON.stringify(bayern)}`);
    console.log('');

    // 2. Alle Vereine mit Stadion + Spielern laden
    const vereine: VereinMitStadionUndSpielern[] =
        await prisma.fussballverein.findMany({
            include: { stadion: true, spieler: true },
        });
    console.log(`vereineMitStadionUndSpielern=${JSON.stringify(vereine)}`);
    console.log('');

    // 3. Filter: Alle Spieler eines Vereins mit bestimmtem Nachnamen
    const spieler = await prisma.spieler.findMany({
        where: { nachname: { contains: 'o' } },
        include: { fussballverein: true },
    });
    console.log(`spieler=${JSON.stringify(spieler)}`);
    console.log('');
} finally {
    await prisma.$disconnect();
}

/* eslint-enable n/no-process-env */
