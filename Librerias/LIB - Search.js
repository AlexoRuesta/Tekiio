/**
 * @NApiVersion 2.1
 * @NModuleScope Public
*/

define(["N/ui/serverWidget", "N/search", "N/format", "N/record"], function (serverWidget, search, format, record) {

    class InitSearch {
        constructor(){
        }

        getFilter(name, join = null, operator, values, formula = null) { // Genera un Obj
            return search.createFilter({
                name,
                join,
                operator,
                values,
                formula
            });
        }

        getSearchLookField(type, id = null, columns = null){ // Tipo de búsqueda, internalID, array de columnas (sin join por ahora)
            const customSearch = search.lookupFields({
                type,
                id,
                columns
            }); 

            log.debug("getSearchLookField", JSON.stringify(customSearch))
            return customSearch;
        }


        getSearchCreated(type, filters = null, columns = null){ // Tipo de búsqueda, array de filtros, array de columnas (sin join por ahora)
            let arrResult = new Array();
            const customSearch = search.create({
                type,
                filters,
                columns
            })
            
            customSearch.run().each(function (result) {
                const results = Object.fromEntries(columns.map(c => [c.name, result.getValue({ name: c })]));
                arrResult.push(results);
                return true;
            });

            return arrResult;
        }

        getSavedSearch(isSearch, filters = null){ // Recibe el ID de la búsqueda y un array de filtros
            const savedsearch = search.load({
                id: isSearch
            });

            if(filters){
                savedsearch.filters.push(...filters);
            }

            log.debug("savedsearch.filters",savedsearch.filters)

            return savedsearch;
        }


        getResultSearchCount(isSearch, filters){
            const savedsearch = search.load({
                id: isSearch
            });

            if(filters){
                savedsearch.filters.push(...filters);
            }

            log.debug("savedsearch.filters",savedsearch.filters)

            let pagedData = savedsearch.runPaged({
                pageSize : 1000
            });

            var theCount = pagedData.count;

            return theCount;
        }

        getResultSearch(isSearch, filters){
            let arrResult = new Array();
            const savedsearch = search.load({
                id: isSearch
            });

            if(filters){
                savedsearch.filters.push(...filters);
            }

            log.debug("savedsearch.filters",savedsearch.filters)

            let pagedData = savedsearch.runPaged({
                pageSize : 1000
            });

            var theCount = pagedData.count;
            log.debug("theCount",theCount)
            
            let page, columns;

            pagedData.pageRanges.forEach(function(pageRange) {
                page = pagedData.fetch({
                    index : pageRange.index
                });

                page.data.forEach(function(result) {
                    let arr = new Object();
                    columns = result.columns;
                    
                    columns.forEach(function(col, i) {
                        arr["col_" + i] = result.getValue(col);  
                    });
                    arrResult.push(arr)
                });
            });
            log.debug("arrResult",arrResult)
            return arrResult;
        }

        getResultSearchObj(isSearch, filters, key = Number){
            let arrResult = new Object();
            const savedsearch = search.load({
                id: isSearch
            });

            if(filters){
                savedsearch.filters.push(...filters);
            }

            log.debug("savedsearch.filters",savedsearch.filters)

            let pagedData = savedsearch.runPaged({
                pageSize : 1000
            });

            var theCount = pagedData.count;
            log.debug("theCount",theCount)

            let page, columns;

            pagedData.pageRanges.forEach(function(pageRange) {
                page = pagedData.fetch({
                    index : pageRange.index
                });

                page.data.forEach(function(result) {
                    let arr = new Object();
                    columns = result.columns;
                    
                    columns.forEach(function(col, i) {
                        arr["col_" + i] = result.getValue(col);  
                    });
                    arrResult[arr["col_" + key]] ||= [];
                    arrResult[arr["col_" + key]].push(arr)
                });
            });
            log.debug("arrResult",arrResult)
            return arrResult;
        }
    }

    

    return {
        InitSearch
    }
})

