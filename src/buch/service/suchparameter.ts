// Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Das Modul besteht aus Typdefinitionen für die Suche in `BuchService`.
 * @packageDocumentation
 */

import { type Buchart } from '../../generated/prisma/enums.js';

// Typdefinition für `find`
export type Suchparameter = {
    readonly isbn?: string;
    readonly rating?: number | string;
    readonly art?: Buchart;
    readonly preis?: number;
    readonly rabatt?: number;
    readonly lieferbar?: boolean;
    readonly datum?: string;
    readonly homepage?: string;
    readonly javascript?: string;
    readonly typescript?: string;
    readonly java?: string;
    readonly python?: string;
    readonly titel?: string;
};

// gueltige Namen fuer die Suchparameter
export const suchparameterNamen = [
    'isbn',
    'rating',
    'art',
    'preis',
    'rabatt',
    'lieferbar',
    'datum',
    'homepage',
    'schlagwoerter',
    'titel',
];
