/**
 * Librería de Búsquedas para NetSuite
 * Proporciona una interfaz simplificada para realizar búsquedas y consultas
 * en registros de NetSuite usando los módulos N/search y N/query
 * 
 * @NApiVersion 2.1
 * @NModuleScope Public
 */

define(['N/search', 'N/query', 'N/log'], function (search, query, log) {

    /**
     * Clase principal para manejar búsquedas en NetSuite
    */
    class InitSearch {
        /**
         * Inicializa una nueva instancia de la librería de búsquedas
        */
        constructor() {}

        /**
         * Crea un filtro para búsquedas de NetSuite
         * 
         * @param {string} name - Nombre del campo a filtrar
         * @param {string|null} join - Join de tabla relacionada (opcional)
         * @param {string} operator - Operador de comparación (ej: 'anyof', 'is', 'contains')
         * @param {array|string} values - Valores para el filtro
         * @param {string|null} formula - Fórmula personalizada (opcional)
         * @returns {Object} Objeto Filter de NetSuite
        */
        getFilter(name, join = null, operator, values, formula = null) {
            return search.createFilter({
                name,
                join,
                operator,
                values,
                formula
            });
        }

        /**
         * Crea una columna para búsquedas de NetSuite
         * 
         * @param {string} name - Nombre del campo de la columna
         * @param {string|null} join - Join de tabla relacionada (opcional)
         * @param {string|null} summary - Tipo de resumen (ej: 'GROUP', 'SUM', 'COUNT', 'AVG', 'MAX', 'MIN')
         * @param {string|null} formula - Fórmula personalizada (opcional)
         * @param {string|null} sort - Ordenamiento ('ASC' o 'DESC') (opcional)
         * @param {string|null} label - Etiqueta personalizada para la columna (opcional)
         * @returns {Object} Objeto Column de NetSuite
        */
        getColumn(name, join = null, summary = null, formula = null, sort = null, label = null) {
            const columnConfig = {
                name,
                join,
                summary,
                formula,
                label
            };

            // Solo agregar sort si está especificado
            if (sort) {
                columnConfig.sort = search.Sort[sort.toUpperCase()];
            }

            // Filtrar propiedades undefined para evitar errores
            Object.keys(columnConfig).forEach(key => {
                if (columnConfig[key] === null || columnConfig[key] === undefined) {
                    delete columnConfig[key];
                }
            });

            return search.createColumn(columnConfig);
        }

        /**
         * Realiza una búsqueda de campos específicos en un registro usando lookupFields
         * 
         * @param {string} type - Tipo de registro (ej: 'customer', 'item', 'transaction')
         * @param {string|number} id - ID del registro a consultar
         * @param {array} columns - Array de nombres de campos a recuperar
         * @returns {Object} Objeto con los valores de los campos solicitados
         * @throws {Error} Si ocurre un error durante la búsqueda
        */
        getSearchLookField(type, id = null, columns = null) {
            try {
                const result = search.lookupFields({
                    type,
                    id,
                    columns
                }); 
                
                return result;
            } catch (e) {
                log.error('getSearchLookField ERROR', e);
                throw new Error(`Error in getSearchLookField: ${e.message}`);
            }
        }

        /**
         * Crea y ejecuta una búsqueda personalizada
         * 
         * @param {string} type - Tipo de registro a buscar
         * @param {array} filters - Array de filtros (por defecto: array vacío)
         * @param {array} columns - Array de columnas a recuperar (por defecto: array vacío)
         * @returns {array} Array de objetos con los resultados
         * @throws {Error} Si ocurre un error durante la creación o ejecución de la búsqueda
        */
        getSearchCreated(type, filters = [], columns = []) {
            const arrResult = [];
            try {
                // Crear la búsqueda personalizada
                const customSearch = search.create({
                    type,
                    filters,
                    columns: columns.map(c =>
                        typeof c === 'object'
                            ? search.createColumn(c)
                            : search.createColumn({ 
                                name: c,
                                // Aplicar ordenamiento si está especificado
                                sort: c.sort ? search.Sort[c.sort] : undefined 
                            })
                    )
                });

                // Ejecutar la búsqueda y procesar cada resultado
                customSearch.run().each(result => {
                    const row = {};
                    columns.forEach((c, i) => {
                        // Determinar el nombre de la columna (alias o nombre original)
                        const name = typeof c === 'object' && c.alias ? c.alias : c.name || c;
                        
                        // Crear objeto de columna para getValue/getText
                        const colObj = {
                            name: c.name || c,
                            join: c.join,
                            summary: c.summary,
                            formula: c.formula
                        };

                        // Decidir si usar getValue (valor interno) o getText (texto mostrable)
                        if (typeof c === 'object' && c.asText) {
                            row[name || `col_${i}`] = result.getText(colObj);
                        } else {
                            row[name || `col_${i}`] = result.getValue(colObj);
                        }
                    });
                    arrResult.push(row);
                    return true; // Continuar con el siguiente resultado
                });
                return arrResult;

            } catch (e) {
                log.error('getSearchCreated ERROR', e);
                throw new Error(`Error in getSearchCreated: ${e.message}`);
            }
        }

        /**
         * Carga una búsqueda guardada y opcionalmente añade filtros adicionales
         * 
         * @param {string} id - ID de la búsqueda guardada
         * @param {array} filters - Filtros adicionales a aplicar (opcional)
         * @returns {Object} Objeto Search de NetSuite
         * @throws {Error} Si ocurre un error al cargar la búsqueda guardada
        */
        getSavedSearch(id, filters = []) {
            try {
                // Cargar la búsqueda guardada por su ID
                const savedsearch = search.load({ id });
                
                // Añadir filtros adicionales si se proporcionan
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

        /**
         * Ejecuta una búsqueda guardada y devuelve todos los resultados
         * 
         * @param {string} id - ID de la búsqueda guardada
         * @param {array} filters - Filtros adicionales (opcional)
         * @param {array} alias - Array de alias para las columnas (opcional)
         * @returns {array} Array de objetos con los resultados
         * @throws {Error} Si ocurre un error durante la ejecución
         */
        getResultSearch(id, filters = [], alias = []) {
            const arrResult = [];
            try {
                // Cargar la búsqueda guardada
                const savedsearch = search.load({ id });
                
                // Añadir filtros adicionales si se proporcionan
                if (filters) savedsearch.filters.push(...filters);

                // Ejecutar la búsqueda con paginación (1000 registros por página)
                const pagedData = savedsearch.runPaged({ pageSize: 1000 });
                
                // Procesar cada página de resultados
                pagedData.pageRanges.forEach(pageRange => {
                    const page = pagedData.fetch({ index: pageRange.index });
                    
                    // Procesar cada resultado en la página
                    page.data.forEach(result => {
                        const row = {};
                        result.columns.forEach((col, i) => {
                            // Usar alias si está disponible, sino usar nombre de columna o índice
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

        /**
         * Ejecuta una búsqueda guardada y organiza los resultados en un objeto
         * agrupado por una clave específica. 
         * 
         * @param {string} id - ID de la búsqueda guardada
         * @param {array} filters - Filtros adicionales (opcional)
         * @param {number} key - Índice de la columna que servirá como clave de agrupación
         * @param {array} alias - Array de alias para las columnas (opcional)
         * @returns {Object} Objeto con arrays de resultados agrupados por clave
         * @throws {Error} Si ocurre un error durante la ejecución
        */
        getResultSearchObj(id, filters = [], key = 0, alias = []) {
            const arrResult = {};
            try {
                // Cargar la búsqueda guardada
                const savedsearch = search.load({ id });
                
                // Añadir filtros adicionales si se proporcionan
                if (filters) savedsearch.filters.push(...filters);

                // Ejecutar la búsqueda con paginación
                const pagedData = savedsearch.runPaged({ pageSize: 1000 });
                
                // Procesar cada página de resultados
                pagedData.pageRanges.forEach(pageRange => {
                    const page = pagedData.fetch({ index: pageRange.index });
                    
                    // Procesar cada resultado en la página
                    page.data.forEach(result => {
                        const row = {};
                        result.columns.forEach((col, i) => {
                            const name = alias[i] || col.name || `col_${i}`;
                            row[name] = result.getValue(col);
                        });
                        
                        // Obtener el valor de la clave de agrupación
                        const keyVal = row[alias[key] || `col_${key}`];
                        
                        // Inicializar el array si no existe para esta clave
                        arrResult[keyVal] ||= [];
                        
                        // Añadir el resultado al grupo correspondiente
                        arrResult[keyVal].push(row);
                    });
                });
                return arrResult;
            } catch (e) {
                log.error('getResultSearchObj ERROR', e);
                throw new Error(`Error in getResultSearchObj: ${e.message}`);
            }
        }

        /**
         * Obtiene el número total de registros que coinciden con una búsqueda guardada
         * sin procesar los resultados. Más eficiente cuando solo se necesita el conteo
         * 
         * @param {string} id - ID de la búsqueda guardada
         * @param {array} filters - Filtros adicionales (opcional)
         * @returns {number} Número entero con el conteo de resultados
         * @throws {Error} Si ocurre un error durante el conteo
        */
        getResultSearchCount(id, filters = []) {
            try {
                // Cargar la búsqueda guardada
                const savedsearch = search.load({ id });
                
                // Añadir filtros adicionales si se proporcionan
                if (filters) savedsearch.filters.push(...filters);

                // Ejecutar con paginación y devolver solo el conteo
                const pagedData = savedsearch.runPaged({ pageSize: 1000 });
                return pagedData.count;
            } catch (e) {
                log.error('getResultSearchCount ERROR', e);
                throw new Error(`Error in getResultSearchCount: ${e.message}`);
            }
        }

        /**
         * Ejecuta una consulta SuiteQL y devuelve los resultados mapeados
         * SuiteQL permite consultas SQL más complejas con joins y funciones avanzadas
         * 
         * @param {string} sql - Consulta SQL a ejecutar
         * @returns {array} Array de objetos con los resultados mapeados
         * @throws {Error} Si la consulta SuiteQL falla
        */
        runSuiteQL(sql) {
            try {
                // Ejecutar la consulta SuiteQL
                const resultSet = query.runSuiteQL({ query: sql });
                
                // Devolver los resultados como objetos mapeados
                return resultSet.asMappedResults();
            } catch (e) {
                log.error('runSuiteQL ERROR', e);
                throw new Error(`SuiteQL failed: ${e.message}`);
            }
        }
    }

    // Exportar la clase para uso en otros scripts
    return { InitSearch };
});