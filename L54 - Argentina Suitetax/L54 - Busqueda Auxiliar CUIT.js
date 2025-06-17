/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@NAmdConfig /SuiteScripts/configuration.json
 */
 define(
    [
        "L54/utilidades", "N/search", "N/runtime"
    ],
    function (utilidades, search, runtime) {

        var proceso = "onRequest"
        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {

            var script = runtime.getCurrentScript();

            log.audit("Busqueda Auxiliar", "Busqueda Auxiliar Inicio");
            log.audit("Governance Monitoring", "LINE 25 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

            try {

                if (context.request.method == "GET" || context.request.method == "POST") {

                    var respuestaBusqueda = new Object();
                    respuestaBusqueda.error = false;
                    respuestaBusqueda.mensajeError = new Array();
                    var informacionBusqueda = context.request.parameters;
                    log.audit("informacionBusqueda", JSON.stringify(informacionBusqueda));
                    var id_SS_customer = informacionBusqueda.id_SS;
                    var idSubsidiary = informacionBusqueda.idSubsidiary;
                    var idPadron = informacionBusqueda.idPadron;
                    var consultarClientes = informacionBusqueda.consultarClientes;
                    var busquedatotal = informacionBusqueda.busquedatotal;
                    var resultIndex = parseInt(informacionBusqueda.resultIndex);
                    var resultQuantity = parseInt(informacionBusqueda.resultQuantity);
                    var arrayResultados = JSON.parse(informacionBusqueda.arrayResultados);
                    var bloque = informacionBusqueda.contador;
                    respuestaBusqueda.respuesta = new Array();

                    var featureInEffect = runtime.isFeatureInEffect({
                        feature: "MULTISUBSIDIARYCUSTOMER"
                    });
                    var OneWorld = runtime.isFeatureInEffect({
                        feature: "SUBSIDIARIES"
                      })

                    log.debug("Feature","Multi Sub ->> " + featureInEffect + "->> OneWorld : " + OneWorld + " ID SS ->> " + id_SS_customer);
                    try {
                        var result = [];

                        if (!utilidades.isEmpty(id_SS_customer)) {
                            var searchCUIT = search.load({
                                id: id_SS_customer // puede ser: fieldLookUp.custrecord_l54_conf_padron_id_ss_prov (id de la ss de lista de prov) o fieldLookUp.custrecord_l54_conf_padron_id_ss_prov (id de la ss de lista de clientes)
                            });
                            var filtroS = searchCUIT.filterExpression;

                            // Filtro Subsidiaria
                            if (!utilidades.isEmpty(idSubsidiary)) {
                                idSubsidiary = JSON.parse(idSubsidiary);
                                if (consultarClientes === "true") { // Verifico si se consultan los clientes para filtrar por el campo Subsidiaria
                                    if(featureInEffect){
                                        filtroS.push("AND");
                                        filtroS.push(["msesubsidiary.internalid", search.Operator.ANYOF, idSubsidiary]);
                                    }else{
                                        filtroS.push("AND");
                                        filtroS.push(["subsidiary", search.Operator.ANYOF, idSubsidiary]);
                                    }
                                } else { // Verifico si se consultan los proveedores para filtrar por la lista msesubsidiary
                                    filtroS.push("AND");
                                    filtroS.push(["msesubsidiary.internalid", search.Operator.ANYOF, idSubsidiary]);
                                }
                            }
                            log.debug("filtros search", JSON.stringify(filtroS))
                            searchCUIT.filterExpression = filtroS;

                            var columns = searchCUIT.columns;
                            if(OneWorld){
                                var subsidiarycolumn = search.createColumn({
                                    name: "internalid",
                                    join: "mseSubsidiary",
                                    summary: "GROUP"
                                 });
                                 columns.push(subsidiarycolumn)
                            }   

                            searchCUIT.columns = columns;
                            var contador=0;
                            var resultSearch = searchCUIT.run();

                            var completeResultSet = [];
                            var resultStep = 1000;
                            var resultado;
                            do {
                                resultado = resultSearch.getRange({
                                    start: resultIndex,
                                    end: resultIndex + resultStep
                                });
                                if (!utilidades.isEmpty(resultado) && resultado.length > 0) {
                                    if (resultIndex == 0)
                                        completeResultSet = resultado;
                                    else
                                        completeResultSet = completeResultSet.concat(resultado);
                                }
        
                                // increase pointer
                                resultIndex = resultIndex + resultStep;
                                contador = contador + resultStep;

                                log.audit("resultIndex", resultIndex);
                                log.audit("resultQuantity", resultQuantity);

                            } while (!utilidades.isEmpty(resultado) && resultado.length > 0 && contador < resultQuantity);
                            log.audit("completeResultSet",completeResultSet.length);
                            if (completeResultSet.length > 0) {
                                for (var i = 0; i < completeResultSet.length; i++) {
                                    if(busquedatotal === "false"){
                                        if(arrayResultados.indexOf(completeResultSet[i].getValue({ name: resultSearch.columns[1] }))==-1){
                                            
                                            if(completeResultSet[i].getValue({ name: resultSearch.columns[1] }).indexOf(",") != -1){
                                                var idsInternos = completeResultSet[i].getValue({ name: resultSearch.columns[1] }).split(",");
                                                for(var j=0;j<idsInternos.length;j++){
                                                    var objInfo = {};
                                                    if(arrayResultados.indexOf(idsInternos[j]) == -1){
                                                        objInfo.cuit = completeResultSet[i].getValue({ name: resultSearch.columns[0] });
                                                        objInfo.idInternoEntidades = idsInternos[j];
                                                        objInfo.idContrib = completeResultSet[i].getValue({ name: resultSearch.columns[2] });
                                                        if(OneWorld){ objInfo.subsidiary = completeResultSet[i].getValue({ name: resultSearch.columns[3] });}

                                                        result.push(objInfo);
                                                    }
                                                }
                                            }else{
                                                var objInfo = {};
                                                objInfo.cuit = completeResultSet[i].getValue({ name: resultSearch.columns[0] });
                                                objInfo.idInternoEntidades = completeResultSet[i].getValue({ name: resultSearch.columns[1] });
                                                objInfo.idContrib = completeResultSet[i].getValue({ name: resultSearch.columns[2] });
                                                if(OneWorld){ objInfo.subsidiary = completeResultSet[i].getValue({ name: resultSearch.columns[3] });}
                                                result.push(objInfo);
                                            }
                                        }
                                    } else{
                                        var objInfo = {};
                                        objInfo.cuit = completeResultSet[i].getValue({ name: resultSearch.columns[0] });
                                        objInfo.idInternoEntidades = completeResultSet[i].getValue({ name: resultSearch.columns[1] });
                                        objInfo.idContrib = completeResultSet[i].getValue({ name: resultSearch.columns[2] });
                                        if(OneWorld){objInfo.subsidiary = completeResultSet[i].getValue({ name: resultSearch.columns[3] });}
                                        
                                        result.push(objInfo);
                                    }
                                }
                            } else {
                                log.debug("obtenerCuit", "No se encontraron resultados de entidades");
                            }
                            log.audit("Governance Monitoring", "LINE 125 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                            log.debug("obtenerCuit result", result.length);
                            respuestaBusqueda.respuesta.push(result);
                        }else{
                            log.error("obtenerCuit", "ID de la Saved Search erróneo");
                        }
                    } catch (e) {
                        log.error("obtenerCuit", "Error al Obtener CUITs - Netsuite Excepción: " + e.message);
                    }

                }
                    
            } catch (e) {
                respuestaBusqueda.error = true;
                respuestaBusqueda.mensajeError.push("Excepción Error - Busqueda Auxiliar. Excepción: " + e.message);
                log.error("L54 - Busqueda Auxiliar", "BUSQUEDA AUX - Excepción Busqueda Auxiliar. Excepción: " + e.message);
            }

            //Genero en una lista concatenada los 4:

            var respuestaBusquedaJSON = respuestaBusqueda;

            var responseSuitelet = context.response;
            var informacionRespuestaJSON = [];
            informacionRespuestaJSON.push(respuestaBusquedaJSON);
            log.debug(proceso, "informacionRespuestaJSON: " + JSON.stringify(informacionRespuestaJSON));
            log.audit("Busqueda Auxiliar", "Busqueda Auxiliar Fin");
            responseSuitelet.write({ output: JSON.stringify(informacionRespuestaJSON) });
        }

        return {
            onRequest: onRequest
        };
    });