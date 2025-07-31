/**
 * @NApiVersion 2.1
 * @NModuleScope Public
*/

define(['N/search', 'N/query', 'N/log'], function (search, query, log) {

    class InitSearch {
        constructor() {}

        getFilter(name, join = null, operator, values, formula = null) {
            return search.createFilter({
                name,
                join,
                operator,
                values,
                formula
            });
        }

        getSearchLookField(type, id = null, columns = null) {
            try {
                const result = search.lookupFields({
                type,
                id,
                columns
            }); 
                log.debug('getSearchLookField', JSON.stringify(result));
                return result;
            } catch (e) {
                log.error('getSearchLookField ERROR', e);
                throw new Error(`Error in getSearchLookField: ${e.message}`);
            }
        }

        getSearchCreated(type, filters = [], columns = []) {
            const arrResult = [];
            try {
                const customSearch = search.create({
                    type,
                    filters,
                    columns: columns.map(c =>
                        typeof c === 'object'
                            ? search.createColumn(c)
                            : search.createColumn({ 
                                name: c,
                                sort: c.sort ? search.Sort[c.sort] : undefined 
                            })
                    )
                });

                customSearch.run().each(result => {
                    const row = {};
                    columns.forEach((c, i) => {
                        const name = typeof c === 'object' && c.alias ? c.alias : c.name || c;
                        const colObj = {
                            name: c.name || c,
                            join: c.join,
                            summary: c.summary,
                            formula: c.formula
                        };

                        // Decide si usar getValue o getText:
                        if (typeof c === 'object' && c.asText) {
                            row[name || `col_${i}`] = result.getText(colObj);
                        } else {
                            row[name || `col_${i}`] = result.getValue(colObj);
                        }
                    });
                    arrResult.push(row);
                    return true;
                });
                return arrResult;

            } catch (e) {
                log.error('getSearchCreated ERROR', e);
                throw new Error(`Error in getSearchCreated: ${e.message}`);
            }
        }

        getSavedSearch(id, filters = []) {
            try {
                const savedsearch = search.load({ id });
                if (filters) {
                savedsearch.filters.push(...filters);
            }
            log.debug('getSavedSearch.filters', savedsearch.filters);
            return savedsearch;
            } catch (e) {
                log.error('getSavedSearch ERROR', e);
                throw new Error(`Error loading Saved Search: ${e.message}`);
            }
        }

        getResultSearch(id, filters = [], alias = []) {
            const arrResult = [];
            try {
                const savedsearch = search.load({ id });
                if (filters) savedsearch.filters.push(...filters);

                const pagedData = savedsearch.runPaged({ pageSize: 1000 });
                pagedData.pageRanges.forEach(pageRange => {
                    const page = pagedData.fetch({ index: pageRange.index });
                    page.data.forEach(result => {
                        const row = {};
                        result.columns.forEach((col, i) => {
                            const name = alias[i] || col.name || `col_${i}`;
                            row[name] = result.getValue(col);
                        });
                        arrResult.push(row);
                    });
                });
                return arrResult;
            } catch (e) {
                log.error('getResultSearch ERROR', e);
                throw new Error(`Error in getResultSearch: ${e.message}`);
            }
        }

        getResultSearchObj(id, filters = [], key = 0, alias = []) {
            const arrResult = {};
            try {
                const savedsearch = search.load({ id });
                if (filters) savedsearch.filters.push(...filters);

                const pagedData = savedsearch.runPaged({ pageSize: 1000 });
                pagedData.pageRanges.forEach(pageRange => {
                    const page = pagedData.fetch({ index: pageRange.index });
                    page.data.forEach(result => {
                        const row = {};
                        result.columns.forEach((col, i) => {
                            const name = alias[i] || col.name || `col_${i}`;
                            row[name] = result.getValue(col);
                        });
                        const keyVal = row[alias[key] || `col_${key}`];
                        arrResult[keyVal] ||= [];
                        arrResult[keyVal].push(row);
                    });
                });
                return arrResult;
            } catch (e) {
                log.error('getResultSearchObj ERROR', e);
                throw new Error(`Error in getResultSearchObj: ${e.message}`);
            }
        }

        getResultSearchCount(id, filters = []) {
            try {
                const savedsearch = search.load({ id });
                if (filters) savedsearch.filters.push(...filters);

                const pagedData = savedsearch.runPaged({ pageSize: 1000 });
                return pagedData.count;
            } catch (e) {
                log.error('getResultSearchCount ERROR', e);
                throw new Error(`Error in getResultSearchCount: ${e.message}`);
            }
        }

        /** Opcional: SuiteQL */
        runSuiteQL(sql) {
            try {
                const resultSet = query.runSuiteQL({ query: sql });
                return resultSet.asMappedResults();
            } catch (e) {
                log.error('runSuiteQL ERROR', e);
                throw new Error(`SuiteQL failed: ${e.message}`);
            }
        }
    }

    return { InitSearch };
});
