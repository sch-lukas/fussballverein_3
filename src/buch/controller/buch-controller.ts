// Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

// eslint-disable-next-line max-classes-per-file
import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    NotFoundException,
    Param,
    ParseIntPipe,
    Query,
    Req,
    Res,
    StreamableFile,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { Buchart } from '../../generated/prisma/enums.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import {
    type BuchMitTitel,
    BuchMitTitelUndAbbildungen,
    BuchService,
} from '../service/buch-service.js';
import { createPageable } from '../service/pageable.js';
import { type Suchparameter } from '../service/suchparameter.js';
import { createPage, Page } from './page.js';

/**
 * Klasse für `BuchGetController`, um Queries in _OpenAPI_ bzw. Swagger zu
 * formulieren. `BuchController` hat dieselben Properties wie die Basisklasse
 * `Buch` - allerdings mit dem Unterschied, dass diese Properties beim Ableiten
 * so überschrieben sind, dass sie auch nicht gesetzt bzw. undefined sein
 * dürfen, damit die Queries flexibel formuliert werden können. Deshalb ist auch
 * immer der zusätzliche Typ undefined erforderlich.
 * Außerdem muss noch `string` statt `Date` verwendet werden, weil es in OpenAPI
 * den Typ Date nicht gibt.
 */
export class BuchQuery implements Suchparameter {
    @ApiProperty({ required: false })
    declare readonly isbn?: string;

    @ApiProperty({ required: false })
    declare readonly rating?: number;

    @ApiProperty({ required: false })
    declare readonly art?: Buchart;

    @ApiProperty({ required: false })
    declare readonly preis?: number;

    @ApiProperty({ required: false })
    declare readonly rabatt?: number;

    @ApiProperty({ required: false })
    declare readonly lieferbar?: boolean;

    @ApiProperty({ required: false })
    declare readonly datum?: string;

    @ApiProperty({ required: false })
    declare readonly homepage?: string;

    @ApiProperty({ required: false })
    declare readonly javascript?: string;

    @ApiProperty({ required: false })
    declare readonly typescript?: string;

    @ApiProperty({ required: false })
    declare readonly titel?: string;

    @ApiProperty({ required: false })
    declare size?: string;

    @ApiProperty({ required: false })
    declare page?: string;

    @ApiProperty({ required: false })
    declare only?: 'count';
}

export type CountResult = Record<'count', number>;

/**
 * Die Controller-Klasse für die Verwaltung von Bücher.
 */
// Decorator in TypeScript, zur Standardisierung in ES vorgeschlagen (stage 3)
// https://devblogs.microsoft.com/typescript/announcing-typescript-5-0-beta/#decorators
// https://github.com/tc39/proposal-decorators
@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Buch REST-API')
// @ApiBearerAuth()
// Klassen ab ES 2015
export class BuchController {
    // readonly in TypeScript, vgl. C#
    // private ab ES 2019
    readonly #service: BuchService;

    readonly #logger = getLogger(BuchController.name);

    // Dependency Injection (DI) bzw. Constructor Injection
    // constructor(private readonly service: BuchService) {}
    // https://github.com/tc39/proposal-type-annotations#omitted-typescript-specific-features-that-generate-code
    constructor(service: BuchService) {
        this.#service = service;
    }

    /**
     * Ein Buch wird asynchron anhand seiner ID als Pfadparameter gesucht.
     *
     * Falls es ein solches Buch gibt und `If-None-Match` im Request-Header
     * auf die aktuelle Version des Buches gesetzt war, wird der Statuscode
     * `304` (`Not Modified`) zurückgeliefert. Falls `If-None-Match` nicht
     * gesetzt ist oder eine veraltete Version enthält, wird das gefundene
     * Buch im Rumpf des Response als JSON-Datensatz mit Atom-Links für HATEOAS
     * und dem Statuscode `200` (`OK`) zurückgeliefert.
     *
     * Falls es kein Buch zur angegebenen ID gibt, wird der Statuscode `404`
     * (`Not Found`) zurückgeliefert.
     *
     * @param id Pfad-Parameter `id`
     * @param req Request-Objekt von Express mit Pfadparameter, Query-String,
     *            Request-Header und Request-Body.
     * @param version Versionsnummer im Request-Header bei `If-None-Match`
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Suche mit der Buch-ID' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 1',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Das Buch wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Kein Buch zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Das Buch wurde bereits heruntergeladen',
    })
    async getById(
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<BuchMitTitelUndAbbildungen>> {
        // https://getpino.io/#/docs/api?id=message-string
        this.#logger.debug('getById: id=%d, version=%s', id, version ?? '-1');

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const buch = await this.#service.findById({ id });
        this.#logger.debug('getById(): buch=%o', buch);

        // ETags
        const versionDb = buch.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('getById: versionDb=%d', versionDb ?? -1);
        res.header('ETag', `"${versionDb}"`);

        this.#logger.debug('getById: buch=%o', buch);
        return res.json(buch);
    }

    /**
     * Bücher werden mit Query-Parametern asynchron gesucht. Falls es mindestens
     * ein solches Buch gibt, wird der Statuscode `200` (`OK`) gesetzt. Im Rumpf
     * des Response ist das JSON-Array mit den gefundenen Büchern, die jeweils
     * um Atom-Links für HATEOAS ergänzt sind.
     *
     * Falls es kein Buch zu den Suchparameter gibt, wird der Statuscode `404`
     * (`Not Found`) gesetzt.
     *
     * Falls es keine Query-Parameter gibt, werden alle Bücher ermittelt.
     *
     * @param query Query-Parameter von Express.
     * @param req Request-Objekt von Express.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get()
    @Public()
    @ApiOperation({ summary: 'Suche mit Suchparameter' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit Büchern' })
    async get(
        @Query() query: BuchQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response<Page<Readonly<BuchMitTitel>> | CountResult>> {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const { only } = query;
        if (only !== undefined) {
            const count = await this.#service.count();
            this.#logger.debug('get: count=%d', count);
            return res.json({ count: count });
        }

        const { page, size } = query;
        delete query['page'];
        delete query['size'];
        this.#logger.debug(
            'get: page=%s, size=%s',
            page ?? 'undefined',
            size ?? 'undefined',
        );

        const keys = Object.keys(query) as (keyof BuchQuery)[];
        keys.forEach((key) => {
            if (query[key] === undefined) {
                delete query[key];
            }
        });
        this.#logger.debug('get: query=%o', query);

        const pageable = createPageable({ number: page, size });
        const buecherSlice = await this.#service.find(query, pageable); // NOSONAR
        const buchPage = createPage(buecherSlice, pageable);
        this.#logger.debug('get: buchPage=%o', buchPage);

        return res.json(buchPage).send();
    }

    /**
     * Zu einem Buch mit gegebener ID wird die zugehörige Binärdatei, z.B.
     * ein Bild oder ein Video, heruntergeladen.
     *
     * @param idStr Pfad-Parameter `id`.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get('/file/:id')
    @Public()
    @ApiOperation({ description: 'Suche nach Datei mit der Buch-ID' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 1',
    })
    @ApiNotFoundResponse({ description: 'Keine Datei zur Buch-ID gefunden' })
    @ApiOkResponse({ description: 'Die Datei wurde gefunden' })
    async getFileById(
        @Param('id') idStr: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        this.#logger.debug('getFileById: buchId:%s', idStr);

        const id = Number(idStr);
        if (!Number.isInteger(id)) {
            this.#logger.debug('getById: not isInteger()');
            throw new NotFoundException(`Die Buch-ID ${idStr} ist ungueltig.`);
        }

        const buchFile = await this.#service.findFileByBuchId(id);
        if (buchFile?.data === undefined) {
            throw new NotFoundException('Keine Datei gefunden.');
        }

        // https://docs.nestjs.com/techniques/streaming-files
        res.contentType(buchFile.mimetype ?? 'image/png').set({
            'Content-Disposition': `inline; filename="${buchFile.filename}"`, // eslint-disable-line @typescript-eslint/naming-convention
        });
        return new StreamableFile(buchFile.data);
    }
}
