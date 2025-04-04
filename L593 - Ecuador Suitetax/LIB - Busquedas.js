/**
 * @NApiVersion 2.1
 * @NModuleScope Public
*/

define(["N/ui/serverWidget", "N/search", "N/format", "N/record"], function (serverWidget, search, format, record) {

    class InitSearch {
        constructor(name){
            this.name = name;
        }

        getFilter(name, operator, values, formula = null) {
            return search.createFilter({
                name,
                operator,
                values,
                formula
            });
        }

        getResultSearchCount(isSearch, filters){
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
                    log.debug("arr[ key]",arr["col_" + key])
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

