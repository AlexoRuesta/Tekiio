/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/error", "N/record", "N/search", "L54/utilidades", "N/runtime","L54/Padron","N/http", "N/xml", "N/format"],
    /**
     * @param {error} error
     * @param {record} record
     * @param {search} search
     */
    function (error, record, search, utilities, runtime, libPadron, http, xml, format) {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeLoad(scriptContext) {
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
            var proceso = "beforeSubmit";

            var script = runtime.getCurrentScript();
            log.audit("Governance Monitoring", "LINE 41 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
            try {
                if (scriptContext.type == scriptContext.UserEventType.CREATE) {
                    var objRecord = scriptContext.newRecord;
                    log.debug(proceso, "INICIO beforeSubmit.");
                    var recId = scriptContext.newRecord.id;
                    var recType = scriptContext.newRecord.type;
                    // var objRecord = record.load({
                    //     type: recType,
                    //     id: recId
                    // });
                    var arraySubsi = [];
                    var featureInEffect = runtime.isFeatureInEffect({
                        feature: "MULTISUBSIDIARYCUSTOMER"
                    });
                    var OneWorld = runtime.isFeatureInEffect({
                        feature: "SUBSIDIARIES"
                      })
                    // hacer validacion para cuando haya multisubsidiaria solo para cliente, cuando es vendor siempre tiene la sublista,
                    //si no es multisubsidiaria(feature) el cliente tomar desde el campo subsidary, si el featuere de one world o  campo subsidiaria no esta activo, no obtener nada
                    var numLines = objRecord.getLineCount({
                        sublistId: "submachine"
                    });
                    log.debug(proceso, "numLines: "+ numLines);
                    log.audit("Governance Monitoring", "LINE 65 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                    if(OneWorld){
                        if(recType=="customer"){
                            if(featureInEffect){
                                var numLines = objRecord.getLineCount({
                                    sublistId: "submachine"
                                });
                                var arraySubsiProv = [];
                                for(var i =0; i < numLines; i++){
                                    var objField = objRecord.getSublistValue({
                                        sublistId: "submachine",
                                        fieldId: "subsidiary",
                                        line: i
                                    });
        
                                    log.debug("Sublist Subsi", objField);
                                    arraySubsiProv.push(objField);
                                }
                                var filtrosSubsiEnt = [];

                                var filtroSubsiEntity = {};
                                filtroSubsiEntity.name = "internalid";
                                filtroSubsiEntity.operator = "ANYOF";
                                filtroSubsiEntity.values = arraySubsiProv; 
                                filtrosSubsiEnt.push(filtroSubsiEntity);                           
                                
                                log.debug("UserEvent Padron - Proceso Ppal", "before Ingreso sin error customsearch_l54_subsi_arg");
                                var searchCodImpSet = utilities.searchSavedPro("customsearch_l54_subsi_arg",filtrosSubsiEnt);
                                log.debug("UserEvent Padron - Proceso Ppal", "after Ingreso sin error customsearch_l54_subsi_arg");

                                if (!searchCodImpSet.error && !utilities.isEmpty(searchCodImpSet.objRsponseFunction.result) && searchCodImpSet.objRsponseFunction.result.length > 0) {

                                    var CodImpResultSet = searchCodImpSet.objRsponseFunction.result;
                                    var CodImpResultSearch = searchCodImpSet.objRsponseFunction.search;
                                    
                                    for(var i = 0; i < CodImpResultSet.length; i++)
                                    {

                                        var idSubsi = CodImpResultSet[i].getValue({
                                            name: CodImpResultSearch.columns[0]
                                        });                                    

                                        arraySubsi.push(idSubsi);
                                    }
                                }
                            }else{
                                var subsidiary = objRecord.getValue("subsidiary");
                                arraySubsi.push(subsidiary);
                            }

                        } else if(recType == "vendor"){
                                var numLines = objRecord.getLineCount({
                                    sublistId: "submachine"
                                });
                                var arraySubsiProv = [];
                                for(var i =0; i < numLines; i++){
                                    var objField = objRecord.getSublistValue({
                                        sublistId: "submachine",
                                        fieldId: "subsidiary",
                                        line: i
                                    });
        
                                    log.debug("Sublist Subsi", objField);
                                    arraySubsiProv.push(objField);
                                }
                                var filtrosSubsiEnt = [];

                                var filtroSubsiEntity = {};
                                filtroSubsiEntity.name = "internalid";
                                filtroSubsiEntity.operator = "ANYOF";
                                filtroSubsiEntity.values = arraySubsiProv; 
                                filtrosSubsiEnt.push(filtroSubsiEntity);                           
                                
                                log.debug("UserEvent Padron - Proceso Ppal", "before Ingreso sin error customsearch_l54_subsi_arg");
                                var searchCodImpSet = utilities.searchSavedPro("customsearch_l54_subsi_arg",filtrosSubsiEnt);
                                log.debug("UserEvent Padron - Proceso Ppal", "after Ingreso sin error customsearch_l54_subsi_arg");

                                if (!searchCodImpSet.error && !utilities.isEmpty(searchCodImpSet.objRsponseFunction.result) && searchCodImpSet.objRsponseFunction.result.length > 0) {

                                    var CodImpResultSet = searchCodImpSet.objRsponseFunction.result;
                                    var CodImpResultSearch = searchCodImpSet.objRsponseFunction.search;
                                    
                                    for(var i = 0; i < CodImpResultSet.length; i++)
                                    {

                                        var idSubsi = CodImpResultSet[i].getValue({
                                            name: CodImpResultSearch.columns[0]
                                        });                                    

                                        arraySubsi.push(idSubsi);
                                    }
                                }
                        }
                    }
                    log.audit("Governance Monitoring", "LINE 161 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                    log.debug(proceso, "Array Subsi:  " + JSON.stringify(arraySubsi));

                    var resultLibreria = libPadron.getConfigGeneral(arraySubsi);
                    log.debug(proceso, "result Config:  " + JSON.stringify(resultLibreria));


                    log.debug("Numero de datos",Object.keys(resultLibreria.result).length);
                    log.audit("Governance Monitoring", "LINE 169 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                    if (!resultLibreria.error && !utilities.isEmpty(resultLibreria.result)) {

                        var urlMiddleware = resultLibreria.confi.link;

                        var numero_cuenta = resultLibreria.confi.numCuenta;

                        var user_account = resultLibreria.confi.usuario;

                        var password_account = resultLibreria.confi.password;

                        log.debug("UserEvent Padron - Proceso Ppal", "Tipos de Contribuyentes");
                        //se consultan los tipos de contribuyente
                        log.audit("Governance Monitoring", "LINE 182 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                        var searchContribSet = utilities.searchSavedPro("customsearch_l54_padron_iibb_det_tipo_c");
                        log.debug("UserEvent Padron - Proceso Ppal", "After SS Tipos de Contribuyentes");
                        
                        var tiposContrib = [];
                        
                        if (!searchContribSet.error && !utilities.isEmpty(searchContribSet.objRsponseFunction.result) && searchContribSet.objRsponseFunction.result.length > 0) {
                            
                            var ContribResultSet = searchContribSet.objRsponseFunction.result;
                            var ContribResultSearch = searchContribSet.objRsponseFunction.search;
                            
                            log.debug("UserEvent Padron - Proceso Ppal", "Ingreso sin error");
                            for(var i = 0; i < ContribResultSet.length; i++)
                            {
                                var objTipoContrib = {};

                                objTipoContrib.id = ContribResultSet[i].getValue({
                                    name: ContribResultSearch.columns[0]
                                });

                                objTipoContrib.tipoPadron = ContribResultSet[i].getValue({
                                    name: ContribResultSearch.columns[1]
                                });
                                
                                objTipoContrib.subTipoPadron = ContribResultSet[i].getValue({
                                    name: ContribResultSearch.columns[2]
                                });
                                
                                objTipoContrib.codigo = ContribResultSet[i].getValue({
                                    name: ContribResultSearch.columns[3]
                                });                                     

                                tiposContrib.push(objTipoContrib);
                            }
                        }
                        log.audit("Governance Monitoring", "LINE 217 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                        var arrayPadrones = [];
                        for (const key in resultLibreria.result) {
                            var obj = resultLibreria.result[key];
                            var idTipoPadron =obj.codigoPadron;
                            arrayPadrones.push(idTipoPadron);
                        }
                        /* 
                        for(var m =0;m < Object.keys(resultLibreria.result).length;m++){
                            var idTipoPadron = resultLibreria.result[m+1].codigoPadron;
                            log.debug("Tipo de Padron",idTipoPadron);
                            arrayPadrones.push(idTipoPadron);
                        }*/ 
                        log.debug("Array Padrones",arrayPadrones);
                        var codRetenciones = [];
                        var codImpuestos = [];

                        log.audit("Governance Monitoring", "LINE 228 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                        if(recType == "vendor"){
                            //se consultan los codigos de retenciones
                            var filtrosCodReten = [];
                            
                            if(!utilities.isEmpty(arraySubsi) && arraySubsi.length > 0){
                                var filtroSubsidiary = {};
                                filtroSubsidiary.name = "custrecord_l54_param_ret_subsidiaria";
                                filtroSubsidiary.operator = "ANYOF";
                                filtroSubsidiary.values = arraySubsi;
                                filtrosCodReten.push(filtroSubsidiary);
                            }

                            var filtroTipoPadron = {};
                            filtroTipoPadron.name = "custrecord_l54_param_ret_tipo_padron";
                            filtroTipoPadron.operator = "ANYOF";
                            filtroTipoPadron.values = arrayPadrones; 
                            filtrosCodReten.push(filtroTipoPadron);                           
                            log.debug("UserEvent Padron - Proceso Ppal", "before Ingreso sin error customsearch_l54_cod_param_retenciones");
                            var searchCodRetenSet = utilities.searchSavedPro("customsearch_l54_cod_param_retenciones",filtrosCodReten);
                            log.debug("UserEvent Padron - Proceso Ppal", "after Ingreso sin error customsearch_l54_cod_param_retenciones");
                            
                            

                            if (!searchCodRetenSet.error && !utilities.isEmpty(searchCodRetenSet.objRsponseFunction.result) && searchCodRetenSet.objRsponseFunction.result.length > 0) {

                                var CodRetenResultSet = searchCodRetenSet.objRsponseFunction.result;
                                var CodRetenResultSearch = searchCodRetenSet.objRsponseFunction.search;
                                
                                for(var i = 0; i < CodRetenResultSet.length; i++)
                                {
                                    var objTipoCodImp = {};

                                    objTipoCodImp.id = CodRetenResultSet[i].getValue({
                                        name: CodRetenResultSearch.columns[0]
                                    });
                                    
                                    objTipoCodImp.subTipoPadron = CodRetenResultSet[i].getValue({
                                        name: CodRetenResultSearch.columns[2]
                                    });
                                    
                                    objTipoCodImp.idInternoSubTipo = CodRetenResultSet[i].getValue({
                                        name: CodRetenResultSearch.columns[3]
                                    });     

                                    objTipoCodImp.idSubsidiaria = CodRetenResultSet[i].getValue({
                                        name: CodRetenResultSearch.columns[4]
                                    });       
                                    
                                    objTipoCodImp.idSubsidiaria = objTipoCodImp.idSubsidiaria.split(",");

                                    objTipoCodImp.tipoPadron = CodRetenResultSet[i].getValue({
                                        name: CodRetenResultSearch.columns[5]
                                    }); 

                                    codRetenciones.push(objTipoCodImp);
                                }
                            }
                            log.debug("UserEvent Padron - Proceso Ppal", "Codigos de Retenciones: " + JSON.stringify(codRetenciones));
                        } else if ("customer") {
                            //se consultan los codigos de impuesto
                            var filtrosCodImp = [];

                            var filtroTipoPadron = {};
                            filtroTipoPadron.name = "custrecord_l54_tipo_padron";
                            filtroTipoPadron.operator = "ANYOF";
                            filtroTipoPadron.values = arrayPadrones; 
                            filtrosCodImp.push(filtroTipoPadron);                           
                            
                            log.debug("UserEvent Padron - Proceso Ppal", "before Ingreso sin error customsearch_l54_padron_cod_imp");
                            var searchCodImpSet = utilities.searchSavedPro("customsearch_l54_padron_cod_imp",filtrosCodImp);
                            log.debug("UserEvent Padron - Proceso Ppal", "after Ingreso sin error customsearch_l54_padron_cod_imp");
                            
                            

                            if (!searchCodImpSet.error && !utilities.isEmpty(searchCodImpSet.objRsponseFunction.result) && searchCodImpSet.objRsponseFunction.result.length > 0) {

                                var CodImpResultSet = searchCodImpSet.objRsponseFunction.result;
                                var CodImpResultSearch = searchCodImpSet.objRsponseFunction.search;
                                
                                for(var i = 0; i < CodImpResultSet.length; i++)
                                {
                                    var objTipoCodImp = {};

                                    objTipoCodImp.id = CodImpResultSet[i].getValue({
                                        name: CodImpResultSearch.columns[0]
                                    });
                                    
                                    objTipoCodImp.subTipoPadron = CodImpResultSet[i].getValue({
                                        name: CodImpResultSearch.columns[2]
                                    });
                                    
                                    objTipoCodImp.idInternoSubTipo = CodImpResultSet[i].getValue({
                                        name: CodImpResultSearch.columns[3]
                                    });                                     
                                    objTipoCodImp.tipoPadron = CodImpResultSet[i].getValue({
                                        name: CodImpResultSearch.columns[4]
                                    });                                     

                                    codImpuestos.push(objTipoCodImp);
                                }
                            }
                            log.debug("UserEvent Padron - Proceso Ppal", "Codigos de Impuesto: " + JSON.stringify(codImpuestos)); 
                        }
                        log.audit("Governance Monitoring", "LINE 326 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                        log.debug("UserEvent Padron - Proceso Ppal", "Tipos de Contribuyentes: " + JSON.stringify(tiposContrib));
                        var periodoFormat = findPeriod();
                        log.debug("periodoFormat",periodoFormat);
                        log.audit("Governance Monitoring", "LINE 330 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());

                        //agregar las funciones posteriores con los filtros de subsidiarias y idtipopadron
                        
                        for(const key in resultLibreria.result){
                            var obj = resultLibreria.result[key];
                            //var key =1;
                            var idTipoPadron = obj.codigoPadron;
                            log.debug("Tipo de Padron",idTipoPadron);
                            var nombrePadron = obj.namePadron;
                            log.debug("nombrePadron",nombrePadron);
                            var idJurisdiccion = obj.jurisdiccion;
                            log.debug("nombrePadron",idJurisdiccion);

                            var obtTipoInscripDesdeEntidad = obj.tipoIns;
                            //eliminar parent company del array subsidiaria, y a la vez solo tener una subsidiaria osea array[0] luego de sacar el parent company

                            var cuitEntity = objRecord.getValue("custentity_l54_cuit_entity");

                            if((!utilities.isEmpty(codRetenciones) && codRetenciones.length > 0) || (!utilities.isEmpty(codImpuestos) && codImpuestos.length > 0)){
                                
                                var objRespuesta = new Object();
                                var padronesFinal = [];
                                var jsonBody = new Object();
                                var header = new Object();
                                jsonBody.usuario = user_account;
                                jsonBody.password = password_account;
                                jsonBody.cuenta = numero_cuenta;
                                jsonBody.idTipoPadron = idTipoPadron;
                                jsonBody.subsidiaria = arraySubsi.length > 0 ? arraySubsi[0] : "";
                                
                                header["Content-Type"] = "text/xml";
                                header["Content-Length"] = "length";
                                
                                jsonBody.fechaDesdeNS = !utilities.isEmpty(periodoFormat) ? periodoFormat : "";
                                jsonBody.cuits = cuitEntity;



                                var xmlPost = '<?xml version="1.0" encoding="utf-8"?> ' + 
                                        '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' + 
                                            'xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"> ' + 
                                            '<soap:Body>' + 
                                                '<consultaPadron xmlns="http://tempuri.org/">' + 
                                                    '<solicitud>' + JSON.stringify(jsonBody) + '</solicitud>' + 
                                                '</consultaPadron>' + 
                                            '</soap:Body>' + 
                                        '</soap:Envelope>';


                                log.debug("UserEvent Padron - Proceso Ppal", "Solicitud xml a enviar: " + xmlPost);
                                
                                var maxAttempts = parseInt(runtime.getCurrentScript().getParameter({ name: 'custscript_l54_cargar_max_attempts'})) || 5;

                                log.debug({
                                    title: 'Consulta Servidor',
                                    details: 'maxAttempts: ' + maxAttempts
                                });

                                try {
                                    var attempt = 0;
                                    var success = false;
                                    var response;

                                    while (attempt < maxAttempts && !success){
                                        try {
                                            // Incrementa el número de intentos
                                            attempt++;
                                            // Log de unidades de gobernanza antes del intento
                                            log.debug({
                                                title: 'Inicio de iteración en intento ' + attempt,
                                                details: 'Unidades de gobernanza restantes: ' + runtime.getCurrentScript().getRemainingUsage()
                                            });
                                            // Ejecuta el POST
                                            var response = http.post({
                                                url: urlMiddleware,
                                                body: xmlPost,
                                                headers: header
                                            });

                                            // Analiza la respuesta
                                            log.debug({
                                                title: 'Respuesta de conexión en intento ' + attempt,
                                                details: 'Código: ' + response.code + ', Body: ' + response.body
                                            });

                                            if (response.code === 200) {
                                                var mensajeError = /Execution Timeout Expired|timeout period elapsed|server is not responding|excedido el tiempo máximo de respuesta/i;
                                                if (mensajeError.test(response.body)) {
                                                    log.debug({
                                                        title: 'Timeout detectado en intento ' + attempt,
                                                        details: 'Se reintentará debido al contenido del body.'
                                                    });
                                                } else {
                                                    success = true; // Si no hay error, se marca como éxito
                                                }
                                            } else {
                                                log.debug({
                                                    title: 'Error en el intento ' + attempt,
                                                    details: 'Código de respuesta: ' + response.code
                                                });
                                            }
                                        } catch (netExcep) {
                                            log.error({
                                                title: 'Error en el intento ' + attempt,
                                                details: netExcep.message
                                            });
                                        }
                                    }

                                    
                                    if (!success) {
                                        throw new Error('Se alcanzó el número máximo de intentos sin éxito');
                                    }
                                } catch (finalError) {
                                    log.error({
                                        title: 'Error Final',
                                        details: finalError.message
                                    });
                                }

                                log.debug("UserEvent Padron - Proceso Ppal", "Codigo de Respuesta de conexion: " + JSON.stringify(response.code));
                                //log.debug("UserEvent Padron - Proceso Ppal", "Codigo de Respuesta de conexion: " + JSON.stringify(response));
                                if (response.code == 200) {
                                    if (!utilities.isEmpty(response.body)) {
                                        //log.debug("response.body", JSON.stringify(response.body));

                                        var xmlDocument = xml.Parser.fromString({
                                            text: response.body
                                        });

                                        //log.debug("xmlDocument", JSON.stringify(xmlDocument));

                                        var nodes = xml.XPath.select({
                                            node: xmlDocument,
                                            xpath: "//*[name()=\"consultaPadronResult\"]"
                                        })

                                        //log.debug("nodes", JSON.stringify(nodes))
                                        if (nodes.length > 0) {
                                            var err = xml.XPath.select({
                                                node: xmlDocument,
                                                xpath: "//*[name()= \"error\"]"
                                            })

                                            var msj = xml.XPath.select({
                                                node: xmlDocument,
                                                xpath: "//*[name()= \"mensaje\"]"
                                            });                                        

                                            var errBool = (err[0].textContent === "true");

                                            var padronConsulta = [];

                                            //log.debug("xml errBool", "err: " + errBool + " - typeof: " + typeof (errBool));
                                            if (errBool == false) {
                                                var arrayPadron = new Array();

                                                var padronesNodes = xml.XPath.select({
                                                    node: xmlDocument,
                                                    xpath: "//*[name()=\"informacionRespuesta\"]"
                                                });

                                                if(!utilities.isEmpty(padronesNodes[0].textContent)) {
                                                    padronConsulta = JSON.parse(padronesNodes[0].textContent);
                                                    log.debug("UserEvent Padron - Proceso Ppal", "- Tamaño array respuesta: " + padronConsulta.length);
                                                    padronesFinal = padronesFinal.concat(padronConsulta);
                                                }
                                                else {
                                                    objRespuesta.error = false;
                                                    objRespuesta.mensaje = "No se encontraron resultados!";
                                                }
                                            } else {
                                                objRespuesta.error = true;
                                                //objRespuesta.mensaje = msj[0].textContent;
                                                objRespuesta.mensaje = "Asegurece que todas las subsidiarias seleccionadas esten dadas de alta.";
                                                //objRespuesta.info = padronesFinal;
                                            } 
                                        }
                                    }
                                } else {
                                    objRespuesta.error = true;
                                    objRespuesta.mensaje = "Error Conectando - Servidor no disponible.";
                                    log.error("UserEvent Padron - Error", "Error Conectando - Servidor no disponible: " + JSON.stringify(response));
                                }

                                log.debug("Padron Data:",JSON.stringify(padronesFinal));

                                for(var i = 0; i < padronesFinal.length; i++){
                                    log.debug("Valores: ","idTipoPadron: "+idTipoPadron+", padronesFinal[i].subTipoPadron: "+padronesFinal[i].subTipoPadron + ", padronesFinal[i].codContrib: "+padronesFinal[i].codContrib);
                                    var arrayContrib = tiposContrib.filter(function(obj) {return (obj.tipoPadron == idTipoPadron && obj.subTipoPadron == padronesFinal[i].subTipoPadron && obj.codigo == padronesFinal[i].codContrib);});
                                    padronesFinal[i].idContrib = (arrayContrib.length > 0) ? arrayContrib[0].id : "";
                                    log.debug("Padron Data [i]:",JSON.stringify(padronesFinal[i]));
                                    log.debug("arrayContrib",JSON.stringify(arrayContrib));
                                    if (utilities.isEmpty(padronesFinal[i].idContrib) && obtTipoInscripDesdeEntidad && !utilities.isEmpty(cuitEntity)) {

                                        // obtener desde el campo tipo contribuyente IIBB dentro del record customer o vendor
                                        var tipoContribIIBB = objRecord.getValue("custentity_l54_tipo_contribuyente_iibb");
                                        padronesFinal[i].idContrib = !utilities.isEmpty(tipoContribIIBB) ? tipoContribIIBB : "";
                                    }
                                    
                                    //delete padronesFinal[i].codContrib;
                                    //delete padronesFinal[i].tipoPadron;

                                    // var arrayfiltradoCod = obtenerCodImpRet(codImpuestos,codRetenciones,recType,arraySubsi[l],padronesFinal[i].subTipoPadron);
                                    // log.debug("ArrayCodigo:",JSON.stringify(arrayfiltradoCod));
                                    
                                    var alicuotaPercepcion = (utilities.isEmpty(padronesFinal[i].alicuotaPercepcion) || parseFloat(padronesFinal[i].alicuotaPercepcion, 10) < 0) ? 0 : parseFloat(padronesFinal[i].alicuotaPercepcion, 10);
                                    var alicuotaRetencion = (utilities.isEmpty(padronesFinal[i].alicuotaRetencion) || parseFloat(padronesFinal[i].alicuotaRetencion, 10) < 0) ? 0 : parseFloat(padronesFinal[i].alicuotaRetencion, 10);
                                    var alicuotaEspecial = (utilities.isEmpty(padronesFinal[i].alicuotaEspecial) || parseFloat(padronesFinal[i].alicuotaEspecial, 10) < 0) ? 0 : parseFloat(padronesFinal[i].alicuotaEspecial, 10);

                                    if (utilities.isEmpty(padronesFinal[i].coeficiente) || parseFloat(padronesFinal[i].coeficiente, 10) < 0)
                                        var coeficienteRetPercp = 0;
                                    else 
                                        var coeficienteRetPercp = parseFloat(padronesFinal[i].coeficiente, 10);

                                    if (utilities.isEmpty(padronesFinal[i].excluido, 10) || padronesFinal[i].excluido.toString().toUpperCase() != "TRUE")
                                    var padronExcluyente = false;
                                    else 
                                    var padronExcluyente = true;

                                    log.debug("Padron Actual:",JSON.stringify(padronesFinal[i]));

                                    if(recType == "customer"){
                                        if (!utilities.isEmpty(alicuotaPercepcion) && alicuotaPercepcion >= 0) {// si alicuota retencion viene vacio no se inserta nada de proveedores
                                            log.debug("Before Eliminar","Antes de ingresar a Eliminar");
                                            log.audit("Governance Monitoring", "LINE 503 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                                            objRecord = eliminarCrearPadrones(cuitEntity,idTipoPadron, arraySubsi, recType, objRecord, recId, alicuotaPercepcion, alicuotaRetencion, idTipoPadron,  padronesFinal[i].idContrib, padronesFinal[i].subTipoPadron, padronExcluyente, coeficienteRetPercp, alicuotaEspecial, codImpuestos, codRetenciones, idJurisdiccion, scriptContext.type);
                                            log.debug("after Eliminar","Despues de ingresar a Eliminar");
                                            log.audit("Governance Monitoring", "LINE 506 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                                            // var objRecord2 = createRegistroIIBBEntJur(recId, null, cuitEntity, alicuotaPercepcion, alicuotaRetencion, idTipoPadron, padronesFinal[i].idContrib, arraySubsi[l], arrayfiltradoCod[0].id, "", arrayfiltradoCod[0].idInternoSubTipo, padronExcluyente, 0, coeficienteRetPercp, 0)
                                                        
                                            // var idNewPadron = objRecord2.save();

                                        } else {
                                            log.error("Insertar - Error", "WS Error en Alicuota Retención para el CUIT: " + cuitEntity);
                                            //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                            objRespuesta.mensaje = "WS Error en Alicuota Retención para el CUIT: " + cuitEntity;
                                            objRespuesta.error = true;
                                            //respuesta.detalles_errores.push(mensaje);
                        
                                        }
                                    } else if(recType == "vendor"){
                                        if (!utilities.isEmpty(alicuotaRetencion) && alicuotaRetencion >= 0) {// si alicuota retencion viene vacio no se inserta nada de proveedores
                                            log.debug("Before Eliminar","Antes de ingresar a Eliminar");
                                            log.audit("Governance Monitoring", "LINE 523 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                                            objRecord = eliminarCrearPadrones(cuitEntity,idTipoPadron, arraySubsi, recType, objRecord, recId, alicuotaPercepcion, alicuotaRetencion, idTipoPadron, padronesFinal[i].idContrib, padronesFinal[i].subTipoPadron, padronExcluyente, coeficienteRetPercp, alicuotaEspecial, codImpuestos, codRetenciones, idJurisdiccion , scriptContext.type);
                                            log.debug("after Eliminar","Despues de ingresar a Eliminar");
                                            log.audit("Governance Monitoring", "LINE 526 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                                            // var objRecord2 = createRegistroIIBBEntJur(null, recId, cuitEntity, alicuotaPercepcion, alicuotaRetencion, idTipoPadron, padronesFinal[i].idContrib, arraySubsi[l], "", arrayfiltradoCod[0].id, arrayfiltradoCod[0].idInternoSubTipo, padronExcluyente, coeficienteRetPercp, 0, alicuotaEspecial);
                                                    
                                            // var idNewPadron = objRecord2.save();
                                        } else {
                                            log.error("Insertar - Error", "WS Error en Alicuota Retención para el CUIT: " + cuitEntity);
                                            //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                            objRespuesta.mensaje = "WS Error en Alicuota Retención para el CUIT: " + cuitEntity;
                                            objRespuesta.error = true;

                                        }
                                    }
                                        
                                }
                                    


                            }

                        }
                        log.audit("Governance Monitoring", "LINE 547 - Remaining Usage = " + script.getRemainingUsage() + " --- time: " + new Date());
                    }else{
                        objRespuesta.error = true;
                        objRespuesta.mensaje = "Error Conectando - Servidor no disponible.";
                        log.error("UserEvent Padron - Error", "Error Conectando - Servidor no disponible: " + JSON.stringify(response));
                    }

                    log.debug(proceso, "FIN beforeSubmit.");
                    return true;
                }
            } catch (error) {
                var mensaje = "Error NetSuite Excepción - Before Submit- Detalles: " + error.message;
                log.error(proceso, mensaje);
                throw mensaje;
            }
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {

            
        }

        function obtenerCodImpRet(arrayImpuestos,arrayRetenciones,recType,subsidiaria,subTipoPadron, tipoPadron){
            var arrayRespuesta = [];
            if (recType == "customer") {
                arrayRespuesta = arrayImpuestos.filter(function (obj) { return (obj.subTipoPadron == subTipoPadron && obj.tipoPadron == tipoPadron);});
                
            }else if(recType == "vendor"){
                arrayRespuesta = arrayRetenciones.filter(function (obj) { return (obj.subTipoPadron == subTipoPadron && obj.idSubsidiaria.indexOf(subsidiaria) > -1 && obj.tipoPadron == tipoPadron);});
            }
            return arrayRespuesta;
        }

        function eliminarCrearPadrones(cuitEntity,idTipoPadron, arraySubsi, recType, objRecord, recId, alicuotaPercepcion, alicuotaRetencion, idTipoPadron,  idContrib, subTipoPadron, padronExcluyente, coeficienteRetPercp, alicuotaEspecial, codImpuestos, codRetenciones, idJurisdiccion, contextType){
            //var resultadoEliminar = obtenerPadronesEliminarSS(idTipoPadron, subsidiaria, recType);
            var sublistaJurisdicciones = "";
            var sublistaPadron = "";
            if(recType == "customer"){
                sublistaJurisdicciones = "recmachcustrecord_l54_jurisdicciones_iibb_cli";
                sublistaPadron = "recmachcustrecord_l54_pv_jc_cliente"
            }else{
                sublistaJurisdicciones = "recmachcustrecord_l54_jurisdicciones_iibb_prov";
                sublistaPadron = "recmachcustrecord_l54_pv_jc_proveedor"
            }
            
            var linecountSublistJurisdiccion = objRecord.getLineCount({sublistId: sublistaJurisdicciones});
            log.debug("Cantidad before Padrones",JSON.stringify(linecountSublistJurisdiccion));
            for(var k=0;k<linecountSublistJurisdiccion;k++){
                
                var sublistJurisdiccion = objRecord.getSublistValue({
                    sublistId: sublistaJurisdicciones,
                    fieldId: "custrecord_l54_jurisdicciones_iibb_jur",
                    line: k
                });
                var sublistTipopContribJuris = objRecord.getSublistValue({
                    sublistId: sublistaJurisdicciones,
                    fieldId: "custrecord_l54_jurisdicciones_iibb_tipo",
                    line: k
                });
                if(sublistJurisdiccion == idJurisdiccion){
                    log.debug("Coincidencia encontrada:","Line:"+k);
                    objRecord.removeLine({
                        sublistId: sublistaJurisdicciones,
                        line: k,
                        ignoreRecalc: true
                    });
                    break;
                }
            }
            var linecountSublisJuris = objRecord.getLineCount({sublistId: sublistaJurisdicciones});
            log.debug("Cantidad after",JSON.stringify(linecountSublisJuris));
            objRecord.insertLine({
                sublistId: sublistaJurisdicciones,
                line: linecountSublisJuris,
            });
            objRecord.setSublistValue({
                sublistId: sublistaJurisdicciones,
                fieldId: "custrecord_l54_jurisdicciones_iibb_jur",
                line: linecountSublisJuris,
                value: idJurisdiccion
            });
            objRecord.setSublistValue({
                sublistId: sublistaJurisdicciones,
                fieldId: "custrecord_l54_jurisdicciones_iibb_tipo",
                line: linecountSublisJuris,
                value: idContrib
            });
            if(recType == "customer"){
                objRecord.setSublistValue({
                    sublistId: sublistaJurisdicciones,
                    fieldId: "custrecord_l54_jurisdicciones_iibb_cli",
                    line: linecountSublisJuris,
                    value: recId
                });
            }else{
                objRecord.setSublistValue({
                    sublistId: sublistaJurisdicciones,
                    fieldId: "custrecord_l54_jurisdicciones_iibb_prov",
                    line: linecountSublisJuris,
                    value: recId
                });
            }
            var linecountSublisJuris2 = objRecord.getLineCount({sublistId: sublistaJurisdicciones});
            log.debug("Cantidad after",JSON.stringify(linecountSublisJuris2));
            // var sublistName = objRecord.getSublists();

            // log.debug("Nombre Sublistas",JSON.stringify(sublistName));
            
            if(arraySubsi.length > 0){
                for(var j=0;j<arraySubsi.length;j++){
                    objRecord = setValuesSublistas(cuitEntity,idTipoPadron, arraySubsi[j], recType, objRecord, recId, alicuotaPercepcion, alicuotaRetencion, idTipoPadron,  idContrib, subTipoPadron, padronExcluyente, coeficienteRetPercp, alicuotaEspecial, codImpuestos, codRetenciones, sublistaPadron);
                }
            }else{
                objRecord = setValuesSublistas(cuitEntity,idTipoPadron, "", recType, objRecord, recId, alicuotaPercepcion, alicuotaRetencion, idTipoPadron,  idContrib, subTipoPadron, padronExcluyente, coeficienteRetPercp, alicuotaEspecial, codImpuestos, codRetenciones, sublistaPadron);
            }

            var linecountSublis3 = objRecord.getLineCount({sublistId: sublistaPadron});
            log.debug("Cantidad after",JSON.stringify(linecountSublis3));

            return objRecord;
             
        }
        function setValuesSublistas(cuitEntity,idTipoPadron, subsiId, recType, objRecord, recId, alicuotaPercepcion, alicuotaRetencion, idTipoPadron,  idContrib, subTipoPadron, padronExcluyente, coeficienteRetPercp, alicuotaEspecial, codImpuestos, codRetenciones, sublistaPadron){
            var linecountSublis = objRecord.getLineCount({sublistId: sublistaPadron});
            log.debug("Cantidad before",JSON.stringify(linecountSublis));
            var arrayfiltradoCod = obtenerCodImpRet(codImpuestos,codRetenciones,recType,subsiId,subTipoPadron,idTipoPadron);
            log.debug("ArrayCodigo:",JSON.stringify(arrayfiltradoCod[0]));
            if(!utilities.isEmpty(arrayfiltradoCod[0].id)){
                log.debug("Se encontro coincidencia", "Se encontro coincidencia en ArrayCodigo, debe ser seteado");
                for(var i=0;i<linecountSublis;i++){
                    var sublistSubsidiaria = objRecord.getSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_subsidiaria",
                        line: i
                    });
                    var sublistTipopPadron = objRecord.getSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_tipo_padron",
                        line: i
                    });
                    log.debug("Detalles Sublista:","sublistSubsidiaria: " + sublistSubsidiaria +", sublistippoPadron: " + sublistTipopPadron )
                    if(sublistSubsidiaria == subsiId && sublistTipopPadron == idTipoPadron){
                        log.debug("Coincidencia encontrada:","Line:"+i);
                        objRecord.removeLine({
                            sublistId: sublistaPadron,
                            line: i,
                            ignoreRecalc: true
                        });
                        break;

                    }
                }
                var linecountSublis2 = objRecord.getLineCount({sublistId: sublistaPadron});
                log.debug("Cantidad after",JSON.stringify(linecountSublis2));
                objRecord.insertLine({
                    sublistId: sublistaPadron,
                    line: linecountSublis2,
                });

                objRecord.setSublistValue({
                    sublistId: sublistaPadron,
                    fieldId: "custrecord_l54_pv_jc_cuit",
                    line: linecountSublis2,
                    value: cuitEntity
                });
                objRecord.setSublistValue({
                    sublistId: sublistaPadron,
                    fieldId: "custrecord_l54_pv_jc_alic_perc",
                    line: linecountSublis2,
                    value: alicuotaPercepcion
                }); 
                objRecord.setSublistValue({
                    sublistId: sublistaPadron,
                    fieldId: "custrecord_l54_pv_jc_alic_ret",
                    line: linecountSublis2,
                    value: alicuotaRetencion
                });
                objRecord.setSublistValue({
                    sublistId: sublistaPadron,
                    fieldId: "custrecord_l54_pv_jc_estado",
                    line: linecountSublis2,
                    value: idContrib
                });
                if(!utilities.isEmpty(subsiId)){
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_subsidiaria",
                        line: linecountSublis2,
                        value: subsiId
                    });
                }
                objRecord.setSublistValue({
                    sublistId: sublistaPadron,
                    fieldId: "custrecord_l54_pv_jc_tipo_padron",
                    line: linecountSublis2,
                    value: idTipoPadron
                });
                objRecord.setSublistValue({
                    sublistId: sublistaPadron,
                    fieldId: "custrecord_l54_pv_jc_subtipo_padron",
                    line: linecountSublis2,
                    value: arrayfiltradoCod[0].idInternoSubTipo
                });
                objRecord.setSublistValue({
                    sublistId: sublistaPadron,
                    fieldId: "custrecord_l54_pv_jc_excluyente",
                    line: linecountSublis2,
                    value: padronExcluyente
                });
                if(recType == "customer"){
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_cliente",
                        line: linecountSublis2,
                        value: recId
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_proveedor",
                        line: linecountSublis2,
                        value: null
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_codigo_impuesto",
                        line: linecountSublis2,
                        value: arrayfiltradoCod[0].id
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_cod_retencion",
                        line: linecountSublis2,
                        value: ""
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_coeficiente_ret",
                        line: linecountSublis2,
                        value: 0
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_coeficiente_perc",
                        line: linecountSublis2,
                        value: coeficienteRetPercp
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_alic_ret_esp",
                        line: linecountSublis2,
                        value: 0
                    });
                }else{
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_cliente",
                        line: linecountSublis2,
                        value: null
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_proveedor",
                        line: linecountSublis2,
                        value: recId
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_codigo_impuesto",
                        line: linecountSublis2,
                        value: ""
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_cod_retencion",
                        line: linecountSublis2,
                        value: arrayfiltradoCod[0].id
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_coeficiente_ret",
                        line: linecountSublis2,
                        value: coeficienteRetPercp
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_coeficiente_perc",
                        line: linecountSublis2,
                        value: 0
                    });
                    objRecord.setSublistValue({
                        sublistId: sublistaPadron,
                        fieldId: "custrecord_l54_pv_jc_alic_ret_esp",
                        line: linecountSublis2,
                        value: alicuotaEspecial
                    });
                }

                
            }
            return objRecord;
        }
        function convertToBoolean(string) {

            return ((utilities.isEmpty(string) || string == "F" || string == false) ? false : true);
        }

        function obtenerPadronesEliminarSS(idTipoPadron, subsidiaria, tipoRecord) {

            // log.audit("obtenerPadronesEliminarSS - aplicaClientes: ", aplicaClientes );
            // log.audit("obtenerPadronesEliminarSS - aplicaProveedores: ", aplicaProveedores);
            log.debug("Tipo Record:",tipoRecord);
            var savedSearch = search.load({
                id: "customsearch_l54_iibb_eliminar_padron"
            });
   
            var filterIdTipoPadron = search.createFilter({
                name: "custrecord_l54_pv_jc_tipo_padron",
                operator: search.Operator.IS,
                values: idTipoPadron
            });
   
            savedSearch.filters.push(filterIdTipoPadron);
            //log.error("subsidiaria",subsidiaria)
            if (!utilities.isEmpty(subsidiaria)) {
                var filterIdSubsidiaria = search.createFilter({
                    name: "custrecord_l54_pv_jc_subsidiaria",
                    operator: search.Operator.ANYOF,
                    values: subsidiaria
                });
   
                savedSearch.filters.push(filterIdSubsidiaria);
            }
   
            if (tipoRecord == "customer"){
                    log.audit("obtenerPadronesEliminarSS", "Solamente Clientes");                
                    // Filtro Cliente (no vacío)
                    var filtroCliente = search.createFilter({
                        name: "custrecord_l54_pv_jc_cliente",
                        operator: search.Operator.NONEOF,
                        values: "@NONE@"
                    });
                    savedSearch.filters.push(filtroCliente);
   
                    // Filtro Proveedor (vacío)
                    var filtroProveedor = search.createFilter({
                        name: "custrecord_l54_pv_jc_proveedor",
                        operator: search.Operator.ANYOF,
                        values: "@NONE@"                        
                    });
                    savedSearch.filters.push(filtroProveedor);
   
            } else if(tipoRecord == "vendor"){
                    log.audit("obtenerPadronesEliminarSS", "Solamente Proveedores");      
                    // Filtro Cliente (vacío)
                    var filtroCliente = search.createFilter({
                        name: "custrecord_l54_pv_jc_cliente",
                        operator: search.Operator.ANYOF,
                        values: "@NONE@"
                    });
                    savedSearch.filters.push(filtroCliente);
   
                    // Filtro Proveedor (no vacío)
                    var filtroProveedor = search.createFilter({
                        name: "custrecord_l54_pv_jc_proveedor",
                        operator: search.Operator.NONEOF,
                        values: "@NONE@"
                    });
                    savedSearch.filters.push(filtroProveedor);
            }
   
            //log.audit("obtenerPadronesEliminarSS - savedSearch.filters", savedSearch.filters);                  
            
            var resultSearch = savedSearch.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set
            //log.audit("searchSaved", "resultSearch typeof: "+typeof(resultSearch));
   
            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });
                //log.audit("searchSaved", "resultSearch: "+resultado.length);
                if (!utilities.isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
   
                // increase pointer 
                resultIndex = resultIndex + resultStep;
   
            } while (!utilities.isEmpty(resultado) && resultado.length > 0)
   
            return completeResultSet;
        }

        function createRegistroIIBBEntJur(idCliente, idProveedor, cuit, alicuotaPercepcion, alicuotaRetencion, idTipoPadron, idContrib, subsidiaria, idImpuesto, idRetencion, idInternoSubTipo, padronExcluyente, coeficienteRetencion, coeficientePercepcion, alicuotaEspecial) {
            log.debug("Params createRegistroIIBBEntJur -> ", idProveedor+"/"+idCliente + " Impuesto ->> " + idImpuesto + " Retencion ->> " + idRetencion)
            var objRecord = record.create({
                type: "customrecord_l54_pv_iibb_jur_cliente",
                isDynamic: true
            });
   
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_cuit",
                value: cuit
            });
   
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_alic_perc",
                value: alicuotaPercepcion
            });
            
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_alic_ret",
                value: alicuotaRetencion
            });
            
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_cliente",
                value: idCliente
            });
            
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_proveedor",
                value: idProveedor
            });
   
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_codigo_impuesto",
                value: idImpuesto
            });
   
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_cod_retencion",
                value: idRetencion
            });
   
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_estado",
                value: idContrib
            });
   
            if(!utilities.isEmpty(subsidiaria)){
                objRecord.setValue({
                    fieldId: "custrecord_l54_pv_jc_subsidiaria",
                    value: subsidiaria
                });
            }
            
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_tipo_padron",
                value: idTipoPadron
            });
   
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_subtipo_padron",
                value: idInternoSubTipo
            });
   
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_excluyente",
                value: padronExcluyente
            });
   
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_coeficiente_ret",
                value: coeficienteRetencion
            });
   
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_coeficiente_perc",
                value: coeficientePercepcion
            });
   
            objRecord.setValue({
                fieldId: "custrecord_l54_pv_jc_alic_ret_esp",
                value: alicuotaEspecial
            })
   
            return objRecord;    
        }
        function findPeriod(){
            var periodoFormat="";
            var date = new Date();
            var fechaInicialAUX = format.format({
                value: date,
                type: format.Type.DATE,
                timezone: format.Timezone.AMERICA_BUENOS_AIRES
            });
            var searchPeriodosPadron = search.load({
                id: "customsearch_l54_period_carga_padron"
            });

            var filtroDesde = search.createFilter({
                name: "startdate",
                operator: search.Operator.ONORBEFORE,
                values: fechaInicialAUX
            });
            //"startdate","onorbefore","16/05/2024"
            searchPeriodosPadron.filters.push(filtroDesde);
            var filtroHasta = search.createFilter({
                name: "enddate",
                operator: search.Operator.ONORAFTER,
                values: fechaInicialAUX
            });
            searchPeriodosPadron.filters.push(filtroHasta);
            var filtroQuarter = search.createFilter({
                name: "isquarter",
                operator: search.Operator.IS,
                values: "F"
            });
            searchPeriodosPadron.filters.push(filtroQuarter);
            var filtroYear = search.createFilter({
                name: "isyear",
                operator: search.Operator.IS,
                values: "F"
            });
            searchPeriodosPadron.filters.push(filtroYear);
            log.debug("UserEvent Padron - Proceso Ppal", "BEFORE SEARCH RESULT: ");
            var resultSet = searchPeriodosPadron.run();
            log.debug("UserEvent Padron - Proceso Ppal", "AFTER SEARCH RESULT: " + resultSet);

            var searchResult = resultSet.getRange({
                start: 0,
                end: 1
            });
                log.debug("UserEvent Padron - Proceso Ppal", "SEARCH RESULT: " + searchResult);

            if (!utilities.isEmpty(searchResult) && searchResult.length > 0)
            {
                periodoFormat = searchResult[0].getValue({
                    name: resultSet.columns[3]
                });

                log.debug("UserEvent Padron - Proceso Ppal", "Fecha Formateada: " + periodoFormat);

            }
            return periodoFormat;
        }

        return {
            beforeSubmit: beforeSubmit
        };

    });