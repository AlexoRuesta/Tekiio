const getRangePeriod = (parameters) => {
    log.debug("parameters", JSON.stringify(parameters));
   
    let periodInit = InitSearch.getSearchLookField("accountingperiod", parameters.custpage_period_init, ["internalid","startdate"]);
    let periodEnd = InitSearch.getSearchLookField("accountingperiod", parameters.custpage_period_end, ["internalid","enddate"]);

    let filters = [['startdate', 'onorafter', periodInit.startdate],
                    "AND",
                    ['enddate', 'onorbefore', periodEnd.enddate],
                    "AND",
                    ['isadjust', 'is', 'F'], // Opcional: excluir periodos de ajuste
                    "AND",
                    ['isquarter', 'is', 'F'],
                    "AND",
                    ['isyear', 'is', 'F']
                ];
                
    let columns = ["periodname", "startdate", "enddate"]
    
    let array = InitSearch.getSearchCreated("accountingperiod", filters, columns)

    return array;
 }


 const getInformation = (parameters) => {
    log.debug("parameters", JSON.stringify(parameters));
   
    const filtros = buildFilters(parameters);
    log.debug("filtros", JSON.stringify(filtros));

    let filters = filtros.map(n => InitSearch.getFilter(n.name, n.operator, n.values, n.formula));
    
    let array = InitSearch.getResultSearch("customsearch_l54_fam_asset_search", filters)

    return array;
 }


 const getIndex = (parameters) => {
   let filters = [["isinactive", "is", "F"],
                   "AND",
                   ["custrecord_l54_axi_indice_mes", "anyof", parameters],
                       
               ];

   let columns = ["custrecord_l54_axi_indice_mes.periodname", "custrecord_l54_axi_indice_mes", "custrecord_l54_axi_indice_num"]
   
   let array = InitSearch.getSearchCreated("customrecord_l54_axi_indice", filters, columns)

   return array;
}



const getHistorial = (asset, parameters) => {
   let jsonResult = {
       currentCost: null,
       bookValue: null
   }
   let filters = [
               ["isinactive", "onorbefore", "F"],
               "AND",
               ["custrecord_l54_audit_inflation_asset", "anyof", asset.value],      
               "AND",
               ["custrecord_l54_audit_inflation_date_ini", "anyof", parameters.indexInit[0].custrecord_l54_axi_indice_mes],
               "AND",
               ["custrecord_l54_audit_inflation_date_end", "anyof", parameters.indexEnd[0].custrecord_l54_axi_indice_mes],
           ];

   let columns = ["internalid", "custrecord_l54_audit_inflation_journal", "custrecord_l54_audit_inflation_ca", "custrecord_l54_audit_inflation_nbv"]
   
   let customResult = InitSearch.getSearchCreated("customrecord_l54_audit_inflation", filters, columns)

   if(customResult.length != 0){
       record.delete({
           type: "customrecord_l54_audit_inflation",
           id: customResult[0].internalid,
       });

       record.delete({
           type: "journalentry",
           id: customResult[0].custrecord_l54_audit_inflation_journal,
       });
       jsonResult.currentCost = customResult[0].custrecord_l54_audit_inflation_ca,
       jsonResult.bookValue = customResult[0].custrecord_l54_audit_inflation_nbv
   };

   log.debug("jsonResult", JSON.stringify(jsonResult))
   return jsonResult;
};