/**
* @NApiVersion 2.1
* @NAmdConfig /SuiteScripts/configuration.json
* @NModuleScope Public
*/

define(["N/runtime", "N/log","L54/utilidades"],(runtime, log, utilities) => {


    const getConfigGeneral = (paramSubsidiaries) => {
        const FN = "Libreria Padrón Diario",
            RPT = { error: false, mensaje: "", confi: {}, result: {}};
        try{
            var jsonFinal = {};
            var arrSubsidiaries     = [],
                arrJurRete          = [],
                arrJurPerc          = [],
                arrJurisdicciones   = [],
                arrPadrones         = [],
                arrTotalJurs        = [],
                arrTipoConsulta     = [];

            /** Verificar las configuraciones de la Empresa */

            var OneWorld = runtime.isFeatureInEffect({
                feature: "SUBSIDIARIES"
            })
      
            log.debug("Es OneWorld",OneWorld)
           
            /** Buscar las subsidiarias en Configuración Padrón */

            if(OneWorld){
                var filtros = null;
                if (!utilities.isEmpty(paramSubsidiaries)) {
                    var filtro1 = {},
                        filtros = [];
                    filtro1.name = "custrecord_l54_conf_padron_subsidiaria";
                    filtro1.operator = "ANYOF";
                    filtro1.values = paramSubsidiaries;
                    filtros.push(filtro1);
                }
            }
            
            var objSearchCP = utilities.searchSavedPro("customsearch_l54_buscar_conf_padron", filtros);

            if (objSearchCP.error) {
                RPT.error = true;
                RPT.mensaje = objSearchCP.msj;
                log.error(FN, "Error en consulta de SS L54 - Buscar Configuración Padrón: " + JSON.stringify(RPT));
                return RPT;
            }
    
            var resultSet = objSearchCP.objRsponseFunction.result;
            var resultSearch = objSearchCP.objRsponseFunction.search;
    
            if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {
                for (var i = 0; i < resultSet.length; i++) {
                    var col0 = resultSet[i].getValue({ name: resultSearch.columns[0]});
                    if(OneWorld){
                        var col1 = resultSet[i].getValue({ name: resultSearch.columns[1]}).split(",");
                        var col2 = resultSet[i].getValue({ name: resultSearch.columns[2]});
                        var col3 = resultSet[i].getValue({ name: resultSearch.columns[3]});
                        var col4 = resultSet[i].getValue({ name: resultSearch.columns[4]});
                        var col5 = resultSet[i].getValue({ name: resultSearch.columns[5]});
                        var col6 = resultSet[i].getValue({ name: resultSearch.columns[6]});
                        RPT.confi = {
                            usuario: col2,
                            password: col3,
                            link: col4,
                            numCuenta: col5,
                            emailAut: col6
                        }

                        arrSubsidiaries = arrSubsidiaries.concat(col1);


                    }
                }
            } else {
              RPT.error = true;
              RPT.mensaje = "No hay registros configurados en Configuración Padrón";
              log.error(FN, RPT.mensaje);
              return RPT;
            }

            if(OneWorld){
                arrSubsidiaries = [...new Set(arrSubsidiaries)];
                log.debug("Resultado Configuración Padrón","Longitud: " + arrSubsidiaries.length + " Valores: " + arrSubsidiaries);
            }

            /** Buscar las jurisdicciones de cada subsidiaria configurada en IIBB Configuración General */
            
            if(OneWorld){
                var filtros = null;
                if (!utilities.isEmpty(arrSubsidiaries)) {
                    var filtro1 = {},
                        filtros = [];
                    filtro1.name = "custrecord_l54_pv_gral_subsidiaria";
                    filtro1.operator = "ANYOF";
                    filtro1.values = arrSubsidiaries;
                    filtros.push(filtro1);
                }
            }

            var objSearchCG = utilities.searchSavedPro("customsearch_l54_buscar_conf_general", filtros);

            if (objSearchCG.error) {
                RPT.error = true;
                RPT.mensaje = objSearchCG.msj;
                log.error(FN, "Error en consulta de SS L54 - Buscar IIBB Configuración General: " + JSON.stringify(RPT));
                return RPT;
            }

            var resultSet = objSearchCG.objRsponseFunction.result;
            var resultSearch = objSearchCG.objRsponseFunction.search;

            if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {
                for (var i = 0; i < resultSet.length; i++) {
                    var col0 = resultSet[i].getValue({ name: resultSearch.columns[0]}).split(",");
                    var col1 = resultSet[i].getValue({ name: resultSearch.columns[1]}).split(",");
                    if(OneWorld){
                        var col2 = resultSet[i].getValue({ name: resultSearch.columns[2]});
                    }else{
                        var col2 = "";
                    }

                    arrJurRete = arrJurRete.concat(col0);
                    arrJurPerc = arrJurPerc.concat(col1);

                    arrJurisdicciones.push({
                        sub: col2,
                        ret: [],
                        per: []
                    })
                }
            } else {
              RPT.error = true;
              RPT.mensaje = "No hay registros configurados en el record IIBB Configuración General";
              log.error(FN, RPT.mensaje);
              return RPT;
            }

            arrJurRete = [...new Set(arrJurRete)];
            arrJurPerc = [...new Set(arrJurPerc)];

            arrJurisdicciones.forEach((jurisdiccion) =>{
                arrTotalJurs = arrTotalJurs.concat(arrJurRete);
                arrTotalJurs = arrTotalJurs.concat(arrJurPerc);
                jurisdiccion.ret = arrJurRete,
                jurisdiccion.per = arrJurPerc
            })

            log.debug("Resultado de IIBB Configuración General", " Valores: " + JSON.stringify(arrJurisdicciones));

            /** Obtener los padrones configurados para cada subsidiaria en el record Tipo Padrón */
            
            arrTotalJurs = [...new Set(arrTotalJurs)];

            log.debug("Jurisdicciones", "Cantidad encontradas: " + arrTotalJurs.length + " Valores: " + arrTotalJurs)
            
            var filtros = null;
            if (!utilities.isEmpty(arrTotalJurs)) {
                var filtro1 = {},
                    filtros = [];
                filtro1.name = "custrecord_l54_tipo_padron_jurisdiccion";
                filtro1.operator = "ANYOF";
                filtro1.values = arrTotalJurs;
                filtros.push(filtro1);
            }
            
            var objSearchTP = utilities.searchSavedPro("customsearch_l54_buscar_tipo_padron", filtros);

            if (objSearchTP.error) {
                RPT.error = true;
                RPT.mensaje = objSearchTP.msj;
                log.error(FN, "Error en consulta de SS L54 - Buscar Tipo Padrón " + JSON.stringify(RPT));
                return RPT;
            }

            var resultSet = objSearchTP.objRsponseFunction.result;
            var resultSearch = objSearchTP.objRsponseFunction.search;

            if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {
                for (var i = 0; i < resultSet.length; i++) {
                    var col0 = resultSet[i].getValue({ name: resultSearch.columns[0]});
                    var col1 = resultSet[i].getValue({ name: resultSearch.columns[1]});
                    var col2 = resultSet[i].getValue({ name: resultSearch.columns[2]});
                    var col3 = resultSet[i].getValue({ name: resultSearch.columns[3]});
                    var col4 = resultSet[i].getValue({ name: resultSearch.columns[4]});

                    arrPadrones.push({
                        id: col0,
                        name: col1,
                        jurisdiccion: col2,
                        codigoPadron: col3,
                        tipoIns: col4
                    })
                }
            } else {
                RPT.error = true;
                RPT.mensaje = "No hay registros configurados en el record Tipo Padrón para las jurisdicciones: " + arrTotalJurs;
                log.error(FN, RPT.mensaje);
                return RPT;
            }

            log.debug("Resultado de L54 - Buscar Tipo Padrón","Valores: " + JSON.stringify(arrPadrones));

            /** Buscar Tipo de Consultas de Padron */

            var objSearchTC = utilities.searchSavedPro("customsearch_l54_buscar_tipo_consulta", null);

            if (objSearchTC.error) {
                RPT.error = true;
                RPT.mensaje = objSearchTC.msj;
                log.error(FN, "Error en consulta de SS L54 - Buscar Tipo Consulta Padrón " + JSON.stringify(RPT));
                return RPT;
            }

            var resultSet = objSearchTC.objRsponseFunction.result;
            var resultSearch = objSearchTC.objRsponseFunction.search;

            if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {
                for (var i = 0; i < resultSet.length; i++) {
                    var col0 = resultSet[i].getValue({ name: resultSearch.columns[0]});
                    var col1 = resultSet[i].getValue({ name: resultSearch.columns[1]});
                    var col2 = resultSet[i].getValue({ name: resultSearch.columns[2]});
                    var col3 = resultSet[i].getValue({ name: resultSearch.columns[3]});

                    arrTipoConsulta.push({
                        id: col0,
                        name: col1,
                        ret: col2,
                        per: col3
                    })
                }
            } else {
                RPT.error = true;
                RPT.mensaje = "No hay registros configurados en el record Tipo Consulta Padrón.";
                log.error(FN, RPT.mensaje);
                return RPT;
            }

            log.debug("Resultado de L54 - Tipo Consulta Padrón", "Resultados: " + JSON.stringify(arrTipoConsulta));

            /** Unificar todo */
            
            arrPadrones.forEach( padron => {
                arrJurisdicciones.forEach(result => {
                    var arrRet = result.ret.filter((obj) => obj == padron.jurisdiccion);
                    var arrPer = result.per.filter((obj) => obj == padron.jurisdiccion);

                    var isRet = arrRet.length > 0 ? true : false;
                    var isPer = arrPer.length > 0 ? true : false;

                    if(isRet || isPer){
                        if(!jsonFinal[padron.id]){
                            var arrType = arrTipoConsulta.filter((obj) => obj.ret == isRet && obj.per == isPer) 

                            jsonFinal[padron.id] = {
                                idPadron: padron.id,
                                namePadron: padron.name,
                                codigoPadron: padron.codigoPadron,
                                jurisdiccion: padron.jurisdiccion,
                                tipoIns: padron.tipoIns,
                                subsidiaries: [result.sub],
                                retencion: isRet,
                                percepcion: isPer,
                                tipoConsulta: arrType[0].id
                            }
                        }else{
                            jsonFinal[padron.id].subsidiaries = jsonFinal[padron.id].subsidiaries.concat(result.sub);
                        }
                    }
                })
            });

            RPT.result = jsonFinal;
            log.debug("Resultado al unificar todo","Valor: " + JSON.stringify(RPT));

            return RPT;
        }
        catch(e){
            log.error({ title: "ErrorInExecute", details: e });
        }
    }
    
    
    return {
            getConfigGeneral: getConfigGeneral,
    };
})