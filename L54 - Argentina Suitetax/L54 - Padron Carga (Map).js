/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 * @NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */
 define(["N/record", "N/search", "N/runtime", "N/email", "N/error", "N/file", "L54/utilidades"],

    function (record, search, runtime, email, error, file, utilities) {
   
        function isEmpty(value) {
            if (value === "") {
                return true;
            }
   
            if (value === null) {
                return true;
            }
   
            if (value === undefined) {
                return true;
            }
   
            return false;
        }
   
        function enviarEmail(autor, destinatario, titulo, mensaje) {
            log.debug("Funcionalidades Cupon", "SUMMARIZE - INICIO ENVIO EMAIL - ID AUTOR : " + autor + " - ID DESTINATARIO : " + destinatario + " - TITULO : " + titulo + " - MENSAJE : " + mensaje);
   
            if (!isEmpty(autor) && !isEmpty(destinatario) && !isEmpty(titulo) && !isEmpty(mensaje)) {
                email.send({
                    author: autor,
                    recipients: destinatario,
                    subject: titulo,
                    body: mensaje
                });
            } else {
                var detalleError = "No se recibio la siguiente informacion necesaria para realizar el envio del Email : ";
                if (isEmpty(autor)) {
                    detalleError = detalleError + " ID del Autor del Email / ";
                }
                if (isEmpty(destinatario)) {
                    detalleError = detalleError + " ID del Destinatario del Email / ";
                }
                if (isEmpty(titulo)) {
                    detalleError = detalleError + " ID del Titulo del Email / ";
                }
                if (isEmpty(mensaje)) {
                    detalleError = detalleError + " ID del Mensaje del Email / ";
                }
                log.error("Generar Ordenes de Compras", "SUMMARIZE - Error Envio Email - Error : " + detalleError);
            }
            log.debug("Funcionalidades Cupon", "SUMMARIZE - FIN ENVIO EMAIL");
        }
   
        function handleErrorAndSendNotification(e, stage) {
            log.error("Estado : " + stage + " Error", e);
   
            var author = runtime.getCurrentUser().id;
            var recipients = runtime.getCurrentUser().id;
            var subject = "Proceso Funcionalidades Cupon " + runtime.getCurrentScript().id + " Error en Estado : " + stage;
            var body = "Ocurrio un error con la siguiente informacion : \n" +
                "Codigo de Error: " + e.name + "\n" +
                "Mensaje de Error: " + e.message;
   
            email.send({
                author: author,
                recipients: recipients,
                subject: subject,
                body: body
            });
        }
   
        function handleErrorIfAny(summary) {
            var inputSummary = summary.inputSummary;
            var mapSummary = summary.mapSummary;
            var reduceSummary = summary.reduceSummary;
   
            if (inputSummary.error) {
                var e = error.create({
                    name: "INPUT_STAGE_FAILED",
                    message: inputSummary.error
                });
                handleErrorAndSendNotification(e, "getInputData");
            }
   
            handleErrorInStage("map", mapSummary);
            handleErrorInStage("reduce", reduceSummary);
        }
   
        function handleErrorInStage(stage, summary) {
            var errorMsg = [];
            summary.errors.iterator().each(function (key, value) {
                var msg = "Error: " + key + ". Error was: " + JSON.parse(value).message + "\n";
                errorMsg.push(msg);
                return true;
            });
            if (errorMsg.length > 0) {
                var e = error.create({
                    name: "ERROR_CUSTOM",
                    message: JSON.stringify(errorMsg)
                });
                //handleErrorAndSendNotification(e, stage);
            }
        }

        function obtenerPadronesEliminarExencion(idTipoPadron, subsidiaria, aplicaClientes, aplicaProveedores) {
   
            log.audit("obtenerPadronesEliminarExencion - aplicaClientes: ", aplicaClientes );
            log.audit("obtenerPadronesEliminarExencion - aplicaProveedores: ", aplicaProveedores);
   
            var savedSearch = search.load({
                id: "customsearch_l54_iibb_exencion_padron"
            });
   
            var filterIdTipoPadron = search.createFilter({
                name: "custrecord_l54_pv_jc_tipo_padron",
                operator: search.Operator.IS,
                values: idTipoPadron
            });
   
            savedSearch.filters.push(filterIdTipoPadron);
   
            if (!isEmpty(subsidiaria)) {
                var filterIdSubsidiaria = search.createFilter({
                    name: "custrecord_l54_pv_jc_subsidiaria",
                    operator: search.Operator.ANYOF,
                    values: subsidiaria
                });
   
                savedSearch.filters.push(filterIdSubsidiaria);
            }
   
            if (aplicaClientes == "true" && aplicaProveedores == "false"){           
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
   
            } else if(aplicaClientes == "false" && aplicaProveedores == "true"){ 
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
   
            log.audit("obtenerPadronesEliminarExencion - savedSearch.filters", savedSearch.filters);                  
            
            var resultSearch = savedSearch.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set
   
            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });
                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
   
                // increase pointer 
                resultIndex = resultIndex + resultStep;
   
            } while (!isEmpty(resultado) && resultado.length > 0)
   
            return completeResultSet;
        }
   
        function getJurisdiccionesIIBBExencion (idTipoPadron, subsidiaria, aplicaClientes, aplicaProveedores, idCustomers, idVendors, padronTotal){
   
            var filtros = [],
                arrResult = [],
                textVendors = "",
                textCustomers = "";
    
            var jurisdiccion = search.lookupFields({
                type: "customrecord_l54_tipo_padron",
                id: idTipoPadron,
                columns: ["custrecord_l54_tipo_padron_jurisdiccion"]
              });
            
            try {
                var objSearch = search.load({
                    id: 'customsearch_l54_jur_iibb_exencion' 
                });
                var filtroS = objSearch.filterExpression;
        
                filtroS.push("AND");
                filtroS.push(["custrecord_l54_jurisdicciones_iibb_jur", search.Operator.IS, jurisdiccion.custrecord_l54_tipo_padron_jurisdiccion[0].value]);
        
                if (aplicaClientes == "true" && aplicaProveedores == "false"){          
                    // Filtro Cliente (no vacío)
                    filtroS.push("AND");
                    filtroS.push(["custrecord_l54_jurisdicciones_iibb_cli", search.Operator.NONEOF, "@NONE@"]);
        
                    filtroS.push("AND");
                    filtroS.push(["custrecord_l54_jurisdicciones_iibb_prov", search.Operator.ANYOF, "@NONE@"]);
        
                } else if(aplicaClientes == "false" && aplicaProveedores == "true"){ 
                    filtroS.push("AND");
                    filtroS.push(["custrecord_l54_jurisdicciones_iibb_cli", search.Operator.ANYOF, "@NONE@"]);
        
                    filtroS.push("AND");
                    filtroS.push(["custrecord_l54_jurisdicciones_iibb_prov", search.Operator.NONEOF, "@NONE@"]);
                }
               
                if(!padronTotal){
        
                    if (!isEmpty(idVendors)) {
                        textVendors = idVendors;
                    }
                    
                    if (!isEmpty(idCustomers)) {
                        textCustomers = idCustomers;
                    }
        
                    log.debug('Forms idVendors',idVendors )
                    log.debug('Forms idCustomers',idCustomers )
                }
                
                if (objSearch.error) {
                    log.error("funcion getJurisdiccionesIIBBExencion", "Error en consulta de SS Jurisdicciones IIBB - Eliminar");
                }
                objSearch.filterExpression = filtroS;
                log.error('Filtros ',filtroS)
                var contador=0;
                var resultSearch = objSearch.run();
                var resultSet = [];
                var resultIndex = 0;
                var resultStep = 1000;
                var resultado;
                do {
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });
                    if (!utilities.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            resultSet = resultado;
                        else
                            resultSet = resultSet.concat(resultado);
                    }
        
                    // increase pointer
                    resultIndex = resultIndex + resultStep;
                    contador = contador + resultStep;
        
                } while (!utilities.isEmpty(resultado) && resultado.length > 0);
        
                if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {
                    for (var i = 0; i < resultSet.length; i++) {
                        var col0 = resultSet[i].getValue({ name: resultSearch.columns[0]});
                        var col1 = resultSet[i].getValue({ name: resultSearch.columns[1]});
                        if(!padronTotal && (textVendors.indexOf(col1 + ",") != -1 || textCustomers.indexOf(col1 + ",") != -1)){
                            arrResult.push({
                                cuit: col0,
                                idInterno: col1,
                            })
                        }else if(padronTotal){
                            arrResult.push({
                                cuit: col0,
                                idInterno: col1,
                            })
                        }
                        
                    }
                } else {
                    log.error("funcion getJurisdiccionesIIBBDelete", "No hay registros configurados");
                }
                return arrResult;
            } catch (error) {
                log.error("Error en getJurisdiccionesIIBBExencion", error)
            }
            
         }
   
        function getJurisdiccionesIIBBDelete (idTipoPadron, subsidiaria, aplicaClientes, aplicaProveedores, idCustomers, idVendors, padronTotal){
   
           var filtros = [],
               arrResult = [],
               textVendors = "",
               textCustomers = "";
   
           var jurisdiccion = search.lookupFields({
               type: "customrecord_l54_tipo_padron",
               id: idTipoPadron,
               columns: ["custrecord_l54_tipo_padron_jurisdiccion"]
             });
           
           var objSearch = search.load({
               id: 'customsearch_l54_jur_iibb_eliminar' 
           });
           var filtroS = objSearch.filterExpression;
   
           filtroS.push("AND");
           filtroS.push(["custrecord_l54_jurisdicciones_iibb_jur", search.Operator.IS, jurisdiccion.custrecord_l54_tipo_padron_jurisdiccion[0].value]);
   
           if (aplicaClientes == "true" && aplicaProveedores == "false"){          
               // Filtro Cliente (no vacío)
               filtroS.push("AND");
               filtroS.push(["custrecord_l54_jurisdicciones_iibb_cli", search.Operator.NONEOF, "@NONE@"]);
   
               filtroS.push("AND");
               filtroS.push(["custrecord_l54_jurisdicciones_iibb_prov", search.Operator.ANYOF, "@NONE@"]);
   
           } else if(aplicaClientes == "false" && aplicaProveedores == "true"){ 
               filtroS.push("AND");
               filtroS.push(["custrecord_l54_jurisdicciones_iibb_cli", search.Operator.ANYOF, "@NONE@"]);
   
               filtroS.push("AND");
               filtroS.push(["custrecord_l54_jurisdicciones_iibb_prov", search.Operator.NONEOF, "@NONE@"]);
           }
          
           if(!padronTotal){
   
               if (!isEmpty(idVendors)) {
                textVendors = idVendors;
               }
               
               if (!isEmpty(idCustomers)) {
                textCustomers = idCustomers;
               }
   
               log.debug('Forms idVendors',idVendors )
               log.debug('Forms idCustomers',idCustomers )
   
            }
           
           if (objSearch.error) {
               log.error("funcion getJurisdiccionesIIBBDelete", "Error en consulta de SS Jurisdicciones IIBB - Eliminar");
           }
           objSearch.filterExpression = filtroS;
           log.error('Filtros ',filtroS)
           var contador=0;
           var resultSearch = objSearch.run();
           var resultSet = [];
           var resultIndex = 0;
           var resultStep = 1000;
           var resultado;
           do {
               resultado = resultSearch.getRange({
                   start: resultIndex,
                   end: resultIndex + resultStep
               });
               if (!utilities.isEmpty(resultado) && resultado.length > 0) {
                   if (resultIndex == 0)
                       resultSet = resultado;
                   else
                       resultSet = resultSet.concat(resultado);
               }
   
               // increase pointer
               resultIndex = resultIndex + resultStep;
               contador = contador + resultStep;
   
           } while (!utilities.isEmpty(resultado) && resultado.length > 0);
   
           if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {
               for (var i = 0; i < resultSet.length; i++) {
                   var col0 = resultSet[i].getValue({ name: resultSearch.columns[0]});
                   var col1 = resultSet[i].getValue({ name: resultSearch.columns[1]});
                   var col2 = resultSet[i].getValue({ name: resultSearch.columns[2]});
                   if(!padronTotal && (textVendors.indexOf(col2 + ",") != -1 || textCustomers.indexOf(col2 + ",") != -1)){
                        arrResult.push({
                            cuit: col0,
                            idInterno: col1,
                        })
                    }else if(padronTotal){
                        arrResult.push({
                            cuit: col0,
                            idInterno: col1,
                        })
                    }
                   
               }
           } else {
               log.error("funcion getJurisdiccionesIIBBDelete", "No hay registros configurados");
           }
           return arrResult;
        }
   
        function obtenerPadronesEliminarSS(idTipoPadron, subsidiaria, aplicaClientes, aplicaProveedores) {
   
            log.audit("obtenerPadronesEliminarSS - aplicaClientes: ", aplicaClientes );
            log.audit("obtenerPadronesEliminarSS - aplicaProveedores: ", aplicaProveedores);
   
            var savedSearch = search.load({
                id: "customsearch_l54_iibb_eliminar_padron"
            });
   
            var filterIdTipoPadron = search.createFilter({
                name: "custrecord_l54_pv_jc_tipo_padron",
                operator: search.Operator.IS,
                values: idTipoPadron
            });
   
            savedSearch.filters.push(filterIdTipoPadron);
   
            if (!isEmpty(subsidiaria)) {
                var filterIdSubsidiaria = search.createFilter({
                    name: "custrecord_l54_pv_jc_subsidiaria",
                    operator: search.Operator.ANYOF,
                    values: subsidiaria
                });
   
                savedSearch.filters.push(filterIdSubsidiaria);
            }
   
            if (aplicaClientes == "true" && aplicaProveedores == "false"){           
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
   
            } else if(aplicaClientes == "false" && aplicaProveedores == "true"){ 
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
   
            log.audit("obtenerPadronesEliminarSS - savedSearch.filters", savedSearch.filters);                  
            
            var resultSearch = savedSearch.run();
            var completeResultSet = [];
            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set
   
            do {
                // fetch one result set
                resultado = resultSearch.getRange({
                    start: resultIndex,
                    end: resultIndex + resultStep
                });
                if (!isEmpty(resultado) && resultado.length > 0) {
                    if (resultIndex == 0)
                        completeResultSet = resultado;
                    else
                        completeResultSet = completeResultSet.concat(resultado);
                }
   
                // increase pointer 
                resultIndex = resultIndex + resultStep;
   
            } while (!isEmpty(resultado) && resultado.length > 0)
   
            return completeResultSet;
        }
   
        function createRegistroJurisdiccionesIIBB(idCliente, idProveedor, jurisdiccion, idContrib) {
           var objRecord = record.create({
               type: "customrecord_l54_jurisdicciones_iibb",
               isDynamic: true
           });
   
           objRecord.setValue({
               fieldId: "custrecord_l54_jurisdicciones_iibb_tipo",
               value: idContrib
           });
   
           objRecord.setValue({
               fieldId: "custrecord_l54_jurisdicciones_iibb_jur",
               value: jurisdiccion
           });
   
           objRecord.setValue({
               fieldId: "custrecord_l54_jurisdicciones_iibb_cli",
               value: idCliente
           });
           
           objRecord.setValue({
               fieldId: "custrecord_l54_jurisdicciones_iibb_prov",
               value: idProveedor
           });
   
           return objRecord;    
       }
        
        function createRegistroIIBBEntJur(idCliente, idProveedor, cuit, alicuotaPercepcion, alicuotaRetencion, idTipoPadron, idContrib, subsidiaria, idImpuesto, idRetencion, idInternoSubTipo, padronExcluyente, coeficienteRetencion, coeficientePercepcion, alicuotaEspecial) {
            
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
   
            if(!isEmpty(subsidiaria)){
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
   
        function getParams() {
            try {
                var informacion = new Object();
                var currScript = runtime.getCurrentScript();
                var st = JSON.stringify(currScript);
                informacion.idFile = JSON.parse(currScript.getParameter("custscript_3k_file_new"));
                informacion.idTipoPadron = currScript.getParameter("custscript_3k_id_tipo_padron");
                informacion.idSubsidiaria = JSON.parse(currScript.getParameter("custscript_3k_id_subsidiaria"));
                informacion.idUsuario = currScript.getParameter("custscript_3k_id_user");
                informacion.padronTotal = JSON.parse(currScript.getParameter("custscript_3k_padron_total"));
                informacion.jurisdiccion = currScript.getParameter("custscript_3k_jurisdiccion");
   
                var codImpuestos = currScript.getParameter("custscript_3k_cod_impuestos");
                var codRetenciones = currScript.getParameter("custscript_3k_cod_retenciones");
                informacion.codImpuestos = !isEmpty(codImpuestos) ? JSON.parse(codImpuestos) : [];
                informacion.codRetenciones = !isEmpty(codRetenciones) ? JSON.parse(codRetenciones) : [];
                informacion.aplicaClientes = (currScript.getParameter("custscript_3k_aplica_clientes") ? currScript.getParameter("custscript_3k_aplica_clientes") : false) ;
                informacion.aplicaProveedores = (currScript.getParameter("custscript_3k_aplica_proveedores") ? currScript.getParameter("custscript_3k_aplica_proveedores") : false) ;
   
                return informacion;
            } catch (excepcion) {
                log.error("getParams", "INPUT DATA - Excepcion Obteniendo Parametros - Excepcion : " + excepcion.message.toString());
                return null;
            }
        }
   
        function getInputData() {
   
            try {
                
                //Obteniendo parametros
                var informacion = getParams();
   
                log.audit("GetInputData - Parámetros Recibidos", "Parámetros: " + JSON.stringify(informacion));
   
                if (isEmpty(informacion.idFile) || isEmpty(informacion.idTipoPadron) || (informacion.codImpuestos.length == 0 && informacion.codRetenciones.length == 0)) {
                    log.error("GetInputData - Error", "Error obteniendo alguno de los campos enviados por parámetros, el proceso no puede continuar.");
                    return false;
                }                
                var arrayPadronFinal = [],
                   customersIds = '',
                   vendorsIds = '';
   
                //obteniendo informacion del arcxhivo txt
                log.audit("GetInputData - Cantidad idFile", "informacion.idFile.length: " + informacion.idFile.length);
                for(var i = 0; i < informacion.idFile.length; i++){
                    
                    var idFile = informacion.idFile[i];
                    log.audit("GetInputData - Archivo", "idFile: " + idFile);
                
                    var fileResult = file.load({
                        id: idFile
                    });
   
                    var contentFile = fileResult.getContents();
                    var jsonFile = JSON.parse(contentFile);
                    log.audit("Archivo TXT", "Archivo TXT contiene Info: " + !isEmpty(jsonFile));
                    log.audit("Archivo TXT", "Archivo TXT contiene Info: " + JSON.stringify(jsonFile));
                    
                    var arrayPadron = [];
                    arrayPadron = jsonFile.padron;
   
                    log.audit("Archivo TXT", "Array Padron: " + JSON.stringify(arrayPadron));
   
                    if (isEmpty(jsonFile.clientes) && isEmpty(jsonFile.proveedores)) {
                        log.error("GetInputData - Error", "Error obteniendo el array de clientes/proveedores, el proceso no puede continuar.");
                        return false;
                    }                   
   
                    log.audit("GetInputData - Inicializacion Variables", "Clientes: " +  jsonFile.clientes.length + " - Proveedores: " + jsonFile.proveedores.length + " - CodImpuestos: " + informacion.codImpuestos.length + " - CodRetenciones: " + informacion.codRetenciones.length);
                    
   
                    //Se agregan los registros de cliente
                    if(jsonFile.clientes.length > 0) {
                           if(arrayPadronFinal.length != 0){
                               var arrAux = arrayPadronFinal;
                           }else{
                               var arrAux = arrayPadron
                           }
                       var isPadron = "";
                        for (var j = 0; j < jsonFile.clientes.length; j++) {
                           if(!isEmpty(informacion.jurisdiccion)){
                               var arrResult = arrAux.filter((obj) => obj.cuit == jsonFile.clientes[j].cuit && (obj.alicuotaPercepcion || obj.alicuotaRetencion));
                               isPadron = arrResult.length > 0 ? true : false;
                           }
   
                           if(!isNaN(parseFloat(jsonFile.clientes[j].id)) && customersIds.indexOf(jsonFile.clientes[j].id + ',') == -1){
                               customersIds += jsonFile.clientes[j].id + ',';
                           }
                           
                           
                          
                            arrayPadron.unshift({
                                cuit: jsonFile.clientes[j].cuit,
                                subTipoPadron: "",
                                alicuotaPercepcion: "",
                                alicuotaRetencion: "",
                                alicuotaEspecial: "",
                                idContrib: "",
                                idCliente: jsonFile.clientes[j].id,
                                subsidiaria: jsonFile.clientes[j].subsidiaria,
                                padron: isPadron
                            });                        
                        }
                    }
   
                    //Se agregan los registros de proveedor
                    if(jsonFile.proveedores.length > 0) {
                       if(arrayPadronFinal.length != 0){
                           var arrAux = arrayPadronFinal;
                       }else{
                           var arrAux = arrayPadron
                       }
                       var isPadron = ""; 
                        for (var k = 0; k < jsonFile.proveedores.length; k++) {
                           if(!isEmpty(informacion.jurisdiccion)){
                               var arrResult = arrAux.filter((obj) => obj.cuit == jsonFile.proveedores[k].cuit);
                               isPadron = arrResult.length > 0 ? true : false;
                           }
   
                           if(!isNaN(parseFloat(jsonFile.proveedores[k].id)) && vendorsIds.indexOf(jsonFile.proveedores[k].id + ',') == -1){
                               vendorsIds += jsonFile.proveedores[k].id + ',';
                           }
                           
   
                            arrayPadron.unshift({
                                cuit: jsonFile.proveedores[k].cuit,
                                subTipoPadron: "",
                                alicuotaPercepcion: "",
                                alicuotaRetencion: "",
                                alicuotaEspecial: "",
                                idContrib: "",
                                idProveedor: jsonFile.proveedores[k].id,
                                subsidiaria: jsonFile.proveedores[k].subsidiaria,
                                padron: isPadron
                            });                        
                        }
                    }        
                            
                    arrayPadronFinal = arrayPadronFinal.concat(arrayPadron)
                } 

                //Se agregan los registros por exencion
                var arrJurExencion = getJurisdiccionesIIBBExencion(informacion.idTipoPadron, informacion.idSubsidiaria, informacion.aplicaClientes, informacion.aplicaProveedores, customersIds, vendorsIds, informacion.padronTotal);
                    
                for (var i = 0; i < arrJurExencion.length; i++) {
                   arrayPadronFinal.unshift({
                       cuit: arrJurExencion[i].cuit,
                       subTipoPadron: "",
                       alicuotaPercepcion: "",
                       alicuotaRetencion: "",
                       alicuotaEspecial: "",
                       idContrib: "",
                       eliminar: true,
                       tipo: "exencion jurisdiccion",
                       id_reg_eliminar: arrJurExencion[i].idInterno
                   });
               }

               
                //Se agregan los registros por eliminar
                var arrJurisdiccion = getJurisdiccionesIIBBDelete(informacion.idTipoPadron, informacion.idSubsidiaria, informacion.aplicaClientes, informacion.aplicaProveedores, customersIds, vendorsIds, informacion.padronTotal);
                    
                for (var i = 0; i < arrJurisdiccion.length; i++) {
               
                   arrayPadronFinal.unshift({
                       cuit: arrJurisdiccion[i].cuit,
                       subTipoPadron: "",
                       alicuotaPercepcion: "",
                       alicuotaRetencion: "",
                       alicuotaEspecial: "",
                       idContrib: "",
                       eliminar: true,
                       tipo: "jurisdiccion",
                       id_reg_eliminar: arrJurisdiccion[i].idInterno
                   });
               }
   
                if (informacion.padronTotal == true) {

                    var arrPadronExencion = obtenerPadronesEliminarExencion(informacion.idTipoPadron, informacion.idSubsidiaria, informacion.aplicaClientes, informacion.aplicaProveedores, customersIds, vendorsIds, informacion.padronTotal);
                    
                    for (var j = 0; j < arrPadronExencion.length; j++) {
                        var cuit = arrPadronExencion[j].getValue({
                            name: arrPadronExencion[j].columns[0]
                        });
   
                        var id_reg_eliminar = arrPadronExencion[j].getValue({
                            name: arrPadronExencion[j].columns[1]
                        });
   
                            arrayPadronFinal.unshift({
                            cuit: cuit,
                            subTipoPadron: "",
                            alicuotaPercepcion: "",
                            alicuotaRetencion: "",
                            alicuotaEspecial: "",
                            idContrib: "",
                            eliminar: true,
                            tipo: "exencion padron",
                            id_reg_eliminar: id_reg_eliminar
                        });
                    }

                    var searchResult = new Array();
                    searchResult = obtenerPadronesEliminarSS(informacion.idTipoPadron, informacion.idSubsidiaria, informacion.aplicaClientes, informacion.aplicaProveedores);
                    log.audit("GetInputData - Registros a eliminar", "Cantidad de registros a eliminar: " + searchResult.length);
   
                    for (var i = 0; i < searchResult.length; i++) {
                        
                        var cuit = searchResult[i].getValue({
                            name: searchResult[i].columns[0]
                        });
   
                        var id_reg_eliminar = searchResult[i].getValue({
                            name: searchResult[i].columns[1]
                        });
   
                        arrayPadronFinal.unshift({
                            cuit: cuit,
                            subTipoPadron: "",
                            alicuotaPercepcion: "",
                            alicuotaRetencion: "",
                            alicuotaEspecial: "",
                            idContrib: "",
                            eliminar: true,
                            tipo: "entidad",
                            id_reg_eliminar: id_reg_eliminar
                        });
                    }
                }                
                return arrayPadronFinal;
            } catch (error) {
                log.error("GetInputData - Error obteniendo la información del suitelet", error.message);
            }
        }
   
        function map(context) {
   
            try {
                var resultado = context.value;
   
                if (!isEmpty(resultado)) {
   
                    var searchResult = JSON.parse(resultado);                
   
                    var obj = new Object();
                    obj.cuit = searchResult.cuit;
                    obj.subsidiaria = searchResult.subsidiaria;
                    obj.eliminar = false;
                    obj.id_reg_eliminar = "";
                    obj.idCliente = "";
                    obj.idProveedor = "";
                    obj.padron = true;
   
                    if (!isEmpty(searchResult.idCliente)){
                        obj.idCliente = searchResult.idCliente;
                        obj.padron = searchResult.padron;
                    }
   
                    if (!isEmpty(searchResult.idProveedor)){
                        obj.idProveedor = searchResult.idProveedor;
                        obj.padron = searchResult.padron;
                    }                    
   
                    if (!isEmpty(searchResult.eliminar) && searchResult.eliminar == true) {
                        obj.eliminar = searchResult.eliminar;
                        obj.id_reg_eliminar = searchResult.id_reg_eliminar;
                        obj.tipo = searchResult.tipo;
                    }                  
   
                    obj.subTipoPadron = searchResult.subTipoPadron;
                    obj.alicuotaPercepcion = searchResult.alicuotaPercepcion;
                    obj.alicuotaRetencion = searchResult.alicuotaRetencion;
                    obj.alicuotaEspecial = searchResult.alicuotaEspecial;
                    obj.idContrib = searchResult.idContrib;
                    obj.excluido = searchResult.excluido;
                    obj.coeficiente = searchResult.coeficiente;
                    obj.jurisdiccion = searchResult.jurisdiccion;
   
                    var clave = obj.cuit;
                    context.write(clave, JSON.stringify(obj));
                }
                
                //log.audit("Contingencia Padron MAP", "FIN MAP");
   
            } catch (error) {
                log.error("Map Error", error.message);
            }
        }
   
        function reduce(context) {
   
            var respuesta = {"error": false, "detalles_errores": []};
            var mensaje = "";              
   
            try {              
                
                if (!isEmpty(context.values) && context.values.length > 0) {
                    
                    //log.debug("REDUCE " + context.key, JSON.stringify(context.values));
   
                    var stringImpuestos = "";
                    var stringRetenciones = "";
                    var arrayImpuestos = [];
                    var arrayRetenciones = [];
                    var arrayClientes = [];
                    var arrayProveedores = [];
                    var padronData = [];    
                    var arrayEntidad = [];
                    var jsonEntidad = {}  ; 
   
                    //Pre-procesamiento y agrupamiento de informacion                     
                    for (var i = 0; i < context.values.length; i++) { 
                        var data = JSON.parse(context.values[i]);
                       log.debug("Pivotee", JSON.stringify(data));
                        if(data.eliminar || !isEmpty(data.alicuotaPercepcion) || !isEmpty(data.alicuotaRetencion) || !isEmpty(data.alicuotaEspecial)) {
                            padronData.push(data);
                        } 
                        else{
                            if(!isEmpty(data.idCliente)){
                                arrayClientes.push({
                                    "id": data.idCliente, 
                                    "cuit": data.cuit,
                                    "subsidiaria": data.subsidiaria
                                });
   
                                if(!isEmpty(data.padron) && !data.padron){
                                   var arrIDS = data.idCliente.split(",")
                                   for (let i = 0; i < arrIDS.length; i++) {
                                        try {
                                            var objEntity = record.load({
                                                type:"customer",
                                                id: arrIDS[i], 
                                                isDynamic: false
                                            })      
                                            objEntity.setValue("custentity_l54_padron_cargado", true)
                                            objEntity.save({
                                                enableSourcing: false,
                                                ignoreMandatoryFields : true
                                            })  
                                        } catch (error) {
                                            log.error("Error en el check de Cliente " ,arrIDS[i] + " ->> " +  error.message)
                                        }
                                   }                      
                                }
                            }
   
                            if(!isEmpty(data.idProveedor)){
                                arrayProveedores.push({
                                    "id": data.idProveedor, 
                                    "cuit": data.cuit,
                                    "subsidiaria": data.subsidiaria
                                });
   
                                if(!isEmpty(data.padron) && !data.padron){
                                   var arrIDS = data.idProveedor.split(",");
                                   for (let i = 0; i < arrIDS.length; i++) {
                                    try {
                                       var objEntity = record.load({
                                           type:"vendor",
                                           id: arrIDS[i],
                                           isDynamic: false
                                       })        
                                       objEntity.setValue("custentity_l54_padron_cargado", true)
                                       objEntity.save({
                                           enableSourcing: false,
                                           ignoreMandatoryFields : true
                                       })
                                    } catch (error) {
                                        log.error("Error en el check de Proveedor " ,arrIDS[i] + " ->> " +  error.message)
                                    }
                                   }                      
                                }
                            }
                        }
                    }
   
                    if(padronData.length > 0) {
                        log.audit("REDUCE " + context.key, "INICIO REDUCE - CUIT : " + context.key + " - padronData: " + JSON.stringify(padronData));
                        //log.debug("REDUCE " + context.key, "Data Padron:" + JSON.stringify(padronData));
                        log.debug("REDUCE " + context.key, "Array Clientes:" + JSON.stringify(arrayClientes));
                        //log.debug("REDUCE " + context.key, "Array Proveedores:" + JSON.stringify(arrayProveedores));
   
                        //Parametros
                        var currScript = runtime.getCurrentScript();
   
                        //parametro codigos de impuesto
                        stringImpuestos = currScript.getParameter("custscript_3k_cod_impuestos");
                      
                        arrayImpuestos = !isEmpty(stringImpuestos) ? JSON.parse(stringImpuestos) : arrayImpuestos;
                        log.audit("Codigo retencion enviados", "Cod Retenciones: " + JSON.stringify(arrayImpuestos));
                        log.audit("Codigo impuestos enviados", "Cod Impuestos: " + arrayImpuestos.length);
                        //parametro codigos de retencion
                        stringRetenciones = currScript.getParameter("custscript_3k_cod_retenciones");
                        arrayRetenciones = !isEmpty(stringRetenciones) ? JSON.parse(stringRetenciones) : arrayRetenciones;
                        log.audit("Codigo retencion enviados", "Cod Retenciones: " + JSON.stringify(arrayRetenciones));
                        log.audit("Codigo retencion enviados", "longitud: " + arrayRetenciones.length);
                        //parametro Insertar
                        var parametroInsert = currScript.getParameter("custscript_3k_padron_insertar");
                        var insertar = !isEmpty(parametroInsert) ? JSON.parse(parametroInsert) : true;
   
                        //subsidiaria
                        var idSubsidiaria = JSON.parse(currScript.getParameter("custscript_3k_id_subsidiaria"));
   
                        //tipoPadron
                        var idTipoPadron = currScript.getParameter("custscript_3k_id_tipo_padron");
                        
                        //procesamiento principal de Data Padron
                        var alreadyInsert = false; 
                        
                        var arrEntidadesJur = [],
                            arrEntidadesPad = [];
                        for (var j = 0; j < padronData.length; j++){
                            var registro = padronData[j];
                            var eliminar = registro.eliminar;
                            log.debug('registro', registro)
                            if (eliminar == true){
                                if(registro.tipo == "exencion jurisdiccion"){
                                    var array_id_reg_eliminar = registro.id_reg_eliminar.split(",");
                                    arrEntidadesJur = arrEntidadesJur.concat(array_id_reg_eliminar)
                                    padronData[j].eliminar == false;
                                 }else if(registro.tipo == "exencion padron"){
                                    var array_id_reg_eliminar = registro.id_reg_eliminar.split(",");
                                    arrEntidadesPad = arrEntidadesPad.concat(array_id_reg_eliminar)
                                    padronData[j].eliminar == false;
                                 }
                            }
                        }                
                        log.debug('Array de Entidades Jur', arrEntidadesJur)
                        log.debug('Array de Entidades Pad', arrEntidadesPad)
                        for (var i = 0; i < padronData.length; i++) {
                            
                            var registro = padronData[i];
   
                            log.audit("REDUCE", "Data de padrón: " + JSON.stringify(registro) + " - índice: " + i);
                            
                            if (!isEmpty(registro)) {
                                var cuit = registro.cuit;
                                
                                var eliminar = registro.eliminar;
                                
                                if (eliminar == true) { // Elimino los registros en la tabla IIBB Entidad Jurisdicción
                                    var array_id_reg_eliminar = registro.id_reg_eliminar.split(",");
                                    for (var j = 0; j < array_id_reg_eliminar.length; j++) {
                                        var internalid = array_id_reg_eliminar[j];
                                        if(registro.tipo == "entidad"){
                                           record.delete({
                                               type: "customrecord_l54_pv_iibb_jur_cliente",
                                               id: internalid,
                                           });
                                        }else if(registro.tipo == "jurisdiccion"){
                                           record.delete({
                                               type: "customrecord_l54_jurisdicciones_iibb",
                                               id: internalid,
                                           });
                                        }
                                    }
                                } else { // Inserto los registros en la tabla IIBB Entidad Jurisdicción
                                    
                                    if(!alreadyInsert && insertar){
   
                                        alreadyInsert = true;
   
                                        // Verifico si existe el id del contribuyente (estado de inscripción) y el subTipoPadron
                                        var idContrib = registro.idContrib;
                                        var subTipoPadron = registro.subTipoPadron;
                                        if (!isEmpty(idContrib)) {
                                            if (!isEmpty(subTipoPadron)) {
                                                //log.debug("Inserta registro", "Registro: " + JSON.stringify(registro));
   
                                                //CAMBIO PARA EVITAR ALICUOTAS NEGATIVAS
                                                //var alicuotaPercepcion = parseFloat(registro.alicuotaPercepcion, 10);
                                                //var alicuotaRetencion = parseFloat(registro.alicuotaRetencion, 10);
   
                                                var alicuotaPercepcion = (isEmpty(registro.alicuotaPercepcion) || parseFloat(registro.alicuotaPercepcion, 10) < 0) ? 0 : parseFloat(registro.alicuotaPercepcion, 10);
                                                var alicuotaRetencion = (isEmpty(registro.alicuotaRetencion) || parseFloat(registro.alicuotaRetencion, 10) < 0) ? 0 : parseFloat(registro.alicuotaRetencion, 10);
                                                var alicuotaEspecial = (isEmpty(registro.alicuotaEspecial) || parseFloat(registro.alicuotaEspecial, 10) < 0) ? 0 : parseFloat(registro.alicuotaEspecial, 10);
   
                                                if (isEmpty(registro.coeficiente) || parseFloat(registro.coeficiente, 10) < 0)
                                                    var coeficienteRetencion = 0;
                                                else 
                                                    var coeficienteRetencion = parseFloat(registro.coeficiente, 10);
   
                                                var coeficientePercepcion = coeficienteRetencion;
                                                var excluido = registro.excluido;
                                                if (isEmpty(excluido, 10) || excluido.toString().toUpperCase() != "TRUE")
                                                    var padronExcluyente = false;
                                                else 
                                                    var padronExcluyente = true;
   
                                                var arrayCliente = [];                                            
                                                arrayCliente = arrayClientes.filter(function(obj) {return (obj.cuit == cuit);});
   
                                               /** Cambio MultiSubsidiaria */
                                               if(arrayCliente.length > 0){
                                                   var finalClienteArray = [];
                                                   for (var index = 0; index < arrayCliente.length; index++) {
                                                       var elementsID = arrayCliente[index].id.split(",");
                                                       for (var z = 0; z < elementsID.length; z++) {
                                                           finalClienteArray.push({
                                                               id: elementsID[z],
                                                               subsidiaria: arrayCliente[index].subsidiaria
                                                           })   
                                                       }
                                                   }
                                               }
   
                                               if (!isEmpty(finalClienteArray)) {
                                                   var arrayImpuesto = [];
                                                   for (var l = 0; l < finalClienteArray.length; l++) {
                                                       if (!isEmpty(finalClienteArray[l])) {
                                                           arrayImpuesto = arrayImpuestos.filter(function (obj) { return (obj.subTipoPadron == subTipoPadron);});
                                                           var idImpuesto = (arrayImpuesto.length > 0) ? arrayImpuesto[0].id : "";
                                                           
                                                           if (!isEmpty(idImpuesto)) {
                                                               if (!isEmpty(alicuotaPercepcion) && alicuotaPercepcion >= 0) {// si alicuota retencion viene vacio no se inserta nada de proveedores
                                                                   var objRecord = createRegistroIIBBEntJur(finalClienteArray[l].id, null, cuit, alicuotaPercepcion, alicuotaRetencion, idTipoPadron, idContrib, finalClienteArray[l].subsidiaria, idImpuesto, "", arrayImpuesto[0].idInternoSubTipo, padronExcluyente, 0, coeficientePercepcion, 0)
                                                                   if(arrEntidadesPad.indexOf(finalClienteArray[l].id) == -1) var idNewPadron = objRecord.save();
                                                                   if(!jsonEntidad[finalClienteArray[l].id + "///" + idTipoPadron] && arrEntidadesJur.indexOf(finalClienteArray[l].id) == -1){
                                                                       var objJurisdiccion = createRegistroJurisdiccionesIIBB(finalClienteArray[l].id, null, registro.jurisdiccion, idContrib);
                                                                       objJurisdiccion.save();
                                                                       jsonEntidad[finalClienteArray[l].id + "///" + idTipoPadron] = {
                                                                           entidad: finalClienteArray[l].id,
                                                                           padron: idTipoPadron
                                                                       }
                                                                   }
                                                                            
                                                               } else {
                                                                   log.error("REDUCE " + context.key + " - Insertar - Error", "WS Error en Alicuota Retención para el CUIT: " + cuit);
                                                                   //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                                                   mensaje = "WS Error en Alicuota Retención para el CUIT: " + cuit;
                                                                   respuesta.error = true;
                                                                   respuesta.detalles_errores.push(mensaje);
                                               
                                                               }
                                                           } else {
                                                               log.error("REDUCE " + context.key + " - Insertar - Error", "Error en Código de Retención para el CUIT: " + cuit);
                                                               log.error("REDUCE " + context.key + " - Insertar - Error", "CUIT: " + cuit + " idRetencion: " + idRetencion + " arrayRetencion: " + JSON.stringify(arrayRetencion) + " Retenciones Cache: " + JSON.stringify(arrayRetenciones) + " idProveedores: " + JSON.stringify(finalProovedorArray) + " Registro: " + JSON.stringify(registro));
                                                               //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                                               mensaje = "Error en Código de Retención para el CUIT: " + cuit;
                                                               respuesta.error = true;
                                                               respuesta.detalles_errores.push(mensaje);
                                                           }
                                                           
                                                       }
                                                   }
                                                   
                                               }
   
   
                                               /*
                                                registro.idCliente = (arrayCliente.length > 0) ? arrayCliente[0].id : "";
                                                var newSubsidiaria = (arrayCliente.length > 0) ? arrayCliente[0].subsidiaria : "";
                                                var arrayIdsClientes = registro.idCliente.split(",");
   
                                                arrayIdsClientes = arrayIdsClientes.filter(function(elem, index, self) {
                                                    return index == self.indexOf(elem);  
                                                });                                       
   
                                                if (!isEmpty(arrayIdsClientes) && !isEmpty(registro.idCliente)) {
                                                    var arrayImpuesto = [];
                                                    arrayImpuesto = arrayImpuestos.filter(function (obj) { return (obj.subTipoPadron == subTipoPadron);});
                                                    var idImpuesto = (arrayImpuesto.length > 0) ? arrayImpuesto[0].id : "";
   
                                                    if (!isEmpty(idImpuesto)) {
                                                        if (!isEmpty(alicuotaPercepcion) && alicuotaPercepcion >= 0) { // si alicuota percepcion viene vacio no se inserta nada de cliente
                                                            for (var k = 0; k < arrayIdsClientes.length; k++) {
                                                                if (!isEmpty(arrayIdsClientes[k])) {
                                                                    //var objRecord = createRegistroIIBBEntJur(arrayIdsClientes[k], null, cuit, alicuotaPercepcion, (alicuotaRetencion < 0 ? 0 : alicuotaRetencion), idTipoPadron, idContrib, idSubsidiaria, idImpuesto, "", arrayImpuesto[0].idInternoSubTipo);
                                                                    var objRecord = createRegistroIIBBEntJur(arrayIdsClientes[k], null, cuit, alicuotaPercepcion, alicuotaRetencion, idTipoPadron, idContrib, newSubsidiaria, idImpuesto, "", arrayImpuesto[0].idInternoSubTipo, padronExcluyente, 0, coeficientePercepcion, 0)
                                                                                    
                                                                    var idNewPadron = objRecord.save();
                                                                }
                                                            }
                                                        } else {
                                                            log.error("REDUCE " + context.key + " - Insertar - Error", "WS Error en Alicuota Percepción para el CUIT: " + cuit);
                                                            //respuesta.mensajerespuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                                            mensaje = "WS Error en Alicuota Percepción para el CUIT: " + cuit;
                                                            respuesta.error = true;
                                                            respuesta.detalles_errores.push(mensaje);
                                                        }
                                                    } else {
                                                        log.error("REDUCE " + context.key + " - Insertar - Error", "Error en Código de Impuesto para el CUIT: " + cuit); //aca loggear todo para validar posible futuro bug
                                                        log.error("REDUCE " + context.key + " - Insertar - Error", "CUIT: " + cuit + " idImpuesto: " + idImpuesto + " arrayImpuesto: " + JSON.stringify(arrayImpuesto) + " Impuestos Cache: " + JSON.stringify(arrayImpuestos) + " idClientes: " + JSON.stringify(arrayIdsClientes) + " Registro: " + JSON.stringify(registro));
                                                        //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                                        mensaje = "Error en Código de Impuesto para el CUIT: " + cuit;
                                                        respuesta.error = true;
                                                        respuesta.detalles_errores.push(mensaje);
                                                    }
                                                }*/
   
                                                var arrayProveedor = [],
                                                   arrayProvConPadron = [];
                                                arrayProveedor = arrayProveedores.filter(function(obj) {return (obj.cuit == cuit);});
   
                                                /** Cambio MultiSubsidiaria */
                                                if(arrayProveedor.length > 0){
                                                    var finalProovedorArray = [];
                                                    for (var index = 0; index < arrayProveedor.length; index++) {
                                                        var elementsID = arrayProveedor[index].id.split(",");
                                                        for (var z = 0; z < elementsID.length; z++) {
                                                            finalProovedorArray.push({
                                                                id: elementsID[z],
                                                                subsidiaria: arrayProveedor[index].subsidiaria
                                                            })   
                                                        }
                                                    }
                                                }
   
                                                if (!isEmpty(finalProovedorArray)) {
                                                    var arrayRetencion = [];
                                                    for (var l = 0; l < finalProovedorArray.length; l++) {
                                                        if (!isEmpty(finalProovedorArray[l])) {
                                                            arrayRetencion = arrayRetenciones.filter(function (obj) { return (obj.subTipoPadron == subTipoPadron && obj.idSubsidiaria.indexOf(finalProovedorArray[l].subsidiaria) > -1);});
                                                            
                                                            var idRetencion = (arrayRetencion.length > 0) ? arrayRetencion[0].id : "";
                                                           
                                                            if (!isEmpty(idRetencion)) {
                                                                if (!isEmpty(alicuotaRetencion) && alicuotaRetencion >= 0) {// si alicuota retencion viene vacio no se inserta nada de proveedores
                                                                   var objRecord = createRegistroIIBBEntJur(null, finalProovedorArray[l].id, cuit, alicuotaPercepcion, alicuotaRetencion, idTipoPadron, idContrib, finalProovedorArray[l].subsidiaria, "", idRetencion, arrayRetencion[0].idInternoSubTipo, padronExcluyente, coeficienteRetencion, 0, alicuotaEspecial);
                                                                   if(arrEntidadesPad.indexOf(finalProovedorArray[l].id) == -1) var idNewPadron = objRecord.save();
                                                                   if(!jsonEntidad[finalProovedorArray[l].id + "///" + idTipoPadron] && arrEntidadesJur.indexOf(finalProovedorArray[l].id) == -1 ){
                                                                       var objJurisdiccion = createRegistroJurisdiccionesIIBB(null, finalProovedorArray[l].id, registro.jurisdiccion, idContrib);
                                                                       objJurisdiccion.save();
                                                                       jsonEntidad[finalProovedorArray[l].id + "///" + idTipoPadron] = {
                                                                           entidad: finalProovedorArray[l].id,
                                                                           padron: idTipoPadron
                                                                       }
                                                                   }
   
                                                                } else {
                                                                    log.error("REDUCE " + context.key + " - Insertar - Error", "WS Error en Alicuota Retención para el CUIT: " + cuit);
                                                                    //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                                                    mensaje = "WS Error en Alicuota Retención para el CUIT: " + cuit;
                                                                    respuesta.error = true;
                                                                    respuesta.detalles_errores.push(mensaje);
        
                                                                }
                                                            } else {
                                                                log.error("REDUCE " + context.key + " - Insertar - Error", "Error en Código de Retención para el CUIT: " + cuit);
                                                                log.error("REDUCE " + context.key + " - Insertar - Error", "CUIT: " + cuit + " idRetencion: " + idRetencion + " arrayRetencion: " + JSON.stringify(arrayRetencion) + " Retenciones Cache: " + JSON.stringify(arrayRetenciones) + " idProveedores: " + JSON.stringify(finalProovedorArray) + " Registro: " + JSON.stringify(registro));
                                                                //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                                                mensaje = "Error en Código de Retención para el CUIT: " + cuit;
                                                                respuesta.error = true;
                                                                respuesta.detalles_errores.push(mensaje);
                                                            }
                                                            
                                                        }
                                                    }
                                                    
                                                }
                                                /*
   
                                                registro.idProveedor = (arrayProveedor.length > 0) ? arrayProveedor[0].id : "";
                                                log.error("despuesde la jugada", registro.idProveedor)
                                                var arrayIdsProveedores = registro.idProveedor.split(",");
   
                                                arrayIdsProveedores = arrayIdsProveedores.filter(function(elem, index, self) {
                                                    return index == self.indexOf(elem);  
                                                });                                             
                                                
                                                if (!isEmpty(arrayIdsProveedores) && !isEmpty(registro.idProveedor)) {
                                                    var arrayRetencion = [];
                                                    log.error("las retenciones", arrayRetenciones)
                                                    arrayRetencion = arrayRetenciones.filter(function (obj) { return (obj.subTipoPadron == subTipoPadron);});
                                                    var idRetencion = (arrayRetencion.length > 0) ? arrayRetencion[0].id : "";
                                                    log.error("despuesde la jugada de retenciones", idRetencion)
                                                    if (!isEmpty(idRetencion)) {
                                                        if (!isEmpty(alicuotaRetencion) && alicuotaRetencion >= 0) {// si alicuota retencion viene vacio no se inserta nada de proveedores
                                                            for (var l = 0; l < arrayIdsProveedores.length; l++) {
                                                                if (!isEmpty(arrayIdsProveedores[l])) {
                                                                    //var objRecord = createRegistroIIBBEntJur(null, arrayIdsProveedores[l], cuit, (alicuotaPercepcion < 0 ? 0 : alicuotaPercepcion), alicuotaRetencion, idTipoPadron, idContrib, idSubsidiaria, "", idRetencion, arrayRetencion[0].idInternoSubTipo);
                                                                    var objRecord = createRegistroIIBBEntJur(null, arrayIdsProveedores[l], cuit, alicuotaPercepcion, alicuotaRetencion, idTipoPadron, idContrib, idSubsidiaria, "", idRetencion, arrayRetencion[0].idInternoSubTipo, padronExcluyente, coeficienteRetencion, 0, alicuotaEspecial);
                                                                                   
                                                                    var idNewPadron = objRecord.save();
                                                                }
                                                            }
                                                        } else {
                                                            log.error("REDUCE " + context.key + " - Insertar - Error", "WS Error en Alicuota Retención para el CUIT: " + cuit);
                                                            //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                                            mensaje = "WS Error en Alicuota Retención para el CUIT: " + cuit;
                                                            respuesta.error = true;
                                                            respuesta.detalles_errores.push(mensaje);
   
                                                        }
                                                    } else {
                                                        log.error("REDUCE " + context.key + " - Insertar - Error", "Error en Código de Retención para el CUIT: " + cuit);
                                                        log.error("REDUCE " + context.key + " - Insertar - Error", "CUIT: " + cuit + " idRetencion: " + idRetencion + " arrayRetencion: " + JSON.stringify(arrayRetencion) + " Retenciones Cache: " + JSON.stringify(arrayRetenciones) + " idProveedores: " + JSON.stringify(arrayIdsProveedores) + " Registro: " + JSON.stringify(registro));
                                                        //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                                        mensaje = "Error en Código de Retención para el CUIT: " + cuit;
                                                        respuesta.error = true;
                                                        respuesta.detalles_errores.push(mensaje);
                                                    }
                                                }*/
   
                                            } else {
                                                log.error("REDUCE " + context.key + " - Insertar - Error", "Error en SubTipoPadron para el CUIT: " + cuit);
                                                //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                                mensaje = "Error en SubTipoPadron para el CUIT: " + cuit;
                                                respuesta.error = true;
                                                respuesta.detalles_errores.push(mensaje);
                                            }
                                        } else {
                                            log.error("REDUCE " + context.key + " - Insertar - Error", "Error en Estado de Inscripción para el CUIT: " + cuit);
                                            //respuesta.mensaje = "REDUCE - Insertar - Error con el CUIT: " + cuit;
                                            mensaje = "Error en Estado de Inscripción para el CUIT: " + cuit;
                                            respuesta.error = true;
                                            respuesta.detalles_errores.push(mensaje);
                                        }
                                    }
                                }
                            }                        
                        }                        
                    }
                    //log.audit("Contingencia Padron REDUCE", "FIN REDUCE - KEY : " + context.key);
                }
            } catch (error) {
                respuesta.error = true;
                mensaje = "REDUCE Excepcion Inesperada - Mensaje: " + error.message + ", key: " + context.key;
                respuesta.detalles_errores.push(mensaje);             
                log.error("REDUCE " + context.key + " - Excepcion", "Mensaje error: " + error.message + ", key: " + context.key);
            }
   
            context.write(context.key, respuesta);
        }
   
        function summarize(summary) {
   
            try {
                log.debug("SUMMARIZE INFO - GetInputData Report", JSON.stringify(summary.inputSummary));
                log.debug("SUMMARIZE INFO - Map Report", JSON.stringify(summary.mapSummary));
                log.debug("SUMMARIZE INFO - Reduce Report", JSON.stringify(summary.reduceSummary));
   
                var totalReduceErrors = 0;
                var arrayReduceErrors = [];
                var errorReduce = false;
   
                summary.output.iterator().each(function (key, value){
   
                    var respuesta = JSON.parse(value);
   
                    if(respuesta.error == true){
   
                        errorReduce = true;
                        arrayReduceErrors.push(respuesta.detalles_errores);
                        totalReduceErrors++;
                    }
                    return true;
                 });      
                
                log.audit({
                    title: "SUMARIZE - INFO",
                    details: "Total errores en procesamiento: " + totalReduceErrors //+ ", error: " + errorReduce + ", arrayErrores: " + JSON.stringify(arrayReduceErrors)
                });
   
                var informacion = getParams();
   
                var idUsuario = informacion.idUsuario;
   
                
   
                var respuesta = new Object();
                respuesta.error = false;
                respuesta.message = null;
   
                /*Nombre de Tipo Padron*/
                var searchNombrePadron = search.lookupFields({
                    type: "customrecord_l54_tipo_padron",
                    id: informacion.idTipoPadron,
                    columns: "name"
                });
   
                var nombrePadron = isEmpty(searchNombrePadron) ? informacion.idTipoPadron : searchNombrePadron.name;
                
                
   
                var author = idUsuario;
                var recipients = idUsuario;
                var subject = "Proceso Carga Padron - " + nombrePadron;
                
                
                
                if (summary.inputSummary.error) {
                    var e = error.create({
                        name: "INPUT_STAGE_FAILED",
                        message: summary.inputSummary.error
                    });
                    //handleErrorAndSendNotification(e, "getInputData");
   
                    body = "Ocurrio un error con la siguiente informacion : \n" +
                    "Codigo de Error: " + e.name + "\n" +
                    "Mensaje de Error: " + e.message;
   
                    
   
                    email.send({
                        author: author,
                        recipients: recipients,
                        subject: subject,
                        body: body
                    });
   
                    respuesta.error = true;
                    respuesta.message = body;
                } else {
                    
                    var errorMsg = [];
                    summary.mapSummary.errors.iterator().each(function (key, value) {
                        var msg = "MAP Error: " + key + ". Error was: " + JSON.parse(value).message + "\n";
                        errorMsg.push(msg);
                        return true;
                    });
   
                    summary.reduceSummary.errors.iterator().each(function (key, value) {
                        var msg = "REDUCE Error: " + key + ". Error was: " + JSON.parse(value).message + "\n";
                        errorMsg.push(msg);
                        return true;
                    });
   
                    if (errorMsg.length > 0) {
                        
                        var e = error.create({
                            name: "ERROR_CUSTOM",
                            message: JSON.stringify(errorMsg)
                        });
                        //handleErrorAndSendNotification(e, stage);
   
                        body = "Ocurrio un error con la siguiente informacion : \n" +
                        "Codigo de Error: " + e.name + "\n" +
                        "Mensaje de Error: " + e.message;
   
                        email.send({
                            author: author,
                            recipients: recipients,
                            subject: subject,
                            body: body
                        });
   
                        respuesta.error = true;
                        respuesta.message = body;
                    }else{
                        if(errorReduce){
                            
                            var errorString = JSON.stringify(arrayReduceErrors);
                            errorString = errorString.replace(/,/g, "\n").replace(/\[|\]|\"/g, "");
   
                            body = "Ocurrio un error al insertar los siguientes CUITS: \n\n" + errorString;
    
                            email.send({
                                author: author,
                                recipients: recipients,
                                subject: subject,
                                body: body
                            });
    
                            respuesta.error = true;
                            respuesta.message = body;                            
                        }else{
                            
                            body = "Proceso Finalizó correctamente"
                            email.send({
                                author: author,
                                recipients: recipients,
                                subject: subject,
                                body: body
                            });
                            respuesta.message = body;                            
                        }
                    }
                }
   
            } catch (error) {
                log.error("Summarize cath error", error.message);
            }                
        }
   
        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });