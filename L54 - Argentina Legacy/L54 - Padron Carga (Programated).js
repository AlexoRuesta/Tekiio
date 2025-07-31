/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NModuleScope Public
 */

define(["N/runtime", "L54/utilidades", "N/record", "N/file", "N/url", "N/email", "N/search", "N/https", "L54/utilidades", "N/http", "N/xml", "N/task"],

    function (runtime, utilities, record, file, url, email, search, https, util, http, xml, task) {

        var proceso = "L54 - Padron Carga (Programated)";

        /**
         * Definition of the Scheduled script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */

        function getParams() {
            try {
                var informacion = new Object({});
                var currScript = runtime.getCurrentScript();
                var automatico = currScript.getParameter("custscript_l54_scheduled_cargapadron_aut");

                informacion.automatico = (String(automatico).toLowerCase() === "true");
                informacion.padron = currScript.getParameter("custscript_l54_scheduled_cargapadron_pad");
                informacion.periodo = currScript.getParameter("custscript_l54_scheduled_cargapadron_per");
                informacion.consulta_nuevos = currScript.getParameter("custscript_l54_scheduled_cargapadron_con");
                informacion.tipo_consulta_padron = currScript.getParameter("custscript_l54_scheduled_cargapadron_tip");

                if(informacion.automatico){
                    informacion.subsidiary =  JSON.parse(currScript.getParameter("custscript_l54_scheduled_cargapadron_sub"));
                    informacion.email =  currScript.getParameter("custscript_l54_scheduled_cargapadron_ema");
                    informacion.jurisdiccion =  currScript.getParameter("custscript_l54_scheduled_cargapadron_jur");
                }else{
                    var arrSub =  currScript.getParameter("custscript_l54_scheduled_cargapadron_sub");
                    arrSub = arrSub.split("\u0005");
                    informacion.subsidiary = arrSub;
                    informacion.email =  "";
                    informacion.jurisdiccion = ""
                }

                return informacion;
            } catch (excepcion) {
                log.error("getParams", "Excepcion Obteniendo Parametros - Excepcion : " + excepcion.message.toString());
                return null;
            }
        }
        function execute(context) {

            log.audit(proceso, "INICIO - Generar Padron");

            var objRespuesta = new Object();
            objRespuesta.error = false;
            objRespuesta.mensaje = "";
            objRespuesta.taskid = "";

            try {
                var informacion = getParams();
                log.audit(proceso, informacion);
                if (!util.isEmpty(informacion.padron)) {
                    var idTipoPadron = informacion.padron;
                    var idPeriodo = informacion.periodo;

                    var OneWorldAcc = util.l54esOneworld();

                    if((OneWorldAcc && !util.isEmpty(informacion.subsidiary)) || !OneWorldAcc){
                        
                        if(OneWorldAcc)
                            var idSubsidiary = informacion.subsidiary;
                        else
                            var idSubsidiary = null;

                        //Se realiza la busqueda del registro de configuracion
                        var filtrosRegConf = [];
                        if(!util.isEmpty(idSubsidiary)){
                            var filtroRegConfig = {};
                            filtroRegConfig.name = "custrecord_l54_conf_padron_subsidiaria";
                            filtroRegConfig.operator = "ANYOF";
                            filtroRegConfig.values = idSubsidiary;
                            filtrosRegConf.push(filtroRegConfig);
                        }

                        var searchRegConfSet = util.searchSavedPro("customsearch_l54_conf_padron", filtrosRegConf);

                        if (!searchRegConfSet.error && !util.isEmpty(searchRegConfSet.objRsponseFunction.result) && searchRegConfSet.objRsponseFunction.result.length > 0) {

                            var RegConfResultSet = searchRegConfSet.objRsponseFunction.result;
                            var RegConfResultSearch = searchRegConfSet.objRsponseFunction.search;

                            var urlMiddleware = RegConfResultSet[0].getValue({
                                name: RegConfResultSearch.columns[0]
                            });

                            var carpeta = RegConfResultSet[0].getValue({
                                name: RegConfResultSearch.columns[1]
                            });

                            var id_savedSearch_clientes = RegConfResultSet[0].getValue({
                                name: RegConfResultSearch.columns[2]
                            });

                            var id_savedSearch_proveedores = RegConfResultSet[0].getValue({
                                name: RegConfResultSearch.columns[3]
                            });

                            var numero_cuenta = RegConfResultSet[0].getValue({
                                name: RegConfResultSearch.columns[4]
                            });

                            var user_account = RegConfResultSet[0].getValue({
                                name: RegConfResultSearch.columns[5]
                            });

                            var password_account = RegConfResultSet[0].getValue({
                                name: RegConfResultSearch.columns[6]
                            });

                            //se consultan los tipos de contribuyente
                            var searchContribSet = util.searchSavedPro("customsearch_l54_padron_iibb_det_tipo_c");
                            
                            var tiposContrib = [];
                            
                            if (!searchContribSet.error && !util.isEmpty(searchContribSet.objRsponseFunction.result) && searchContribSet.objRsponseFunction.result.length > 0) {

                                var ContribResultSet = searchContribSet.objRsponseFunction.result;
                                var ContribResultSearch = searchContribSet.objRsponseFunction.search;
                                
                                log.debug("Suitlet Padron - Proceso Ppal", "Ingreso sin error");
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
                            log.debug("Suitlet Padron - Proceso Ppal", "Tipos de Contribuyentes: " + JSON.stringify(tiposContrib));

                            //se consultan los codigos de retenciones
                            var filtrosCodReten = [];
                           
                            if(!util.isEmpty(idSubsidiary)){
                                var filtroSubsidiary = {};
                                filtroSubsidiary.name = "custrecord_l54_param_ret_subsidiaria";
                                filtroSubsidiary.operator = "ANYOF";
                                filtroSubsidiary.values = idSubsidiary;
                                filtrosCodReten.push(filtroSubsidiary);
                            }

                            var filtroTipoPadron = {};
                            filtroTipoPadron.name = "custrecord_l54_param_ret_tipo_padron";
                            filtroTipoPadron.operator = "IS";
                            filtroTipoPadron.values = idTipoPadron; 
                            filtrosCodReten.push(filtroTipoPadron);                           
                            var searchCodRetenSet = util.searchSavedPro("customsearch_l54_cod_param_retenciones",filtrosCodReten);
                            
                            var codRetenciones = [];

                            if (!searchCodRetenSet.error && !util.isEmpty(searchCodRetenSet.objRsponseFunction.result) && searchCodRetenSet.objRsponseFunction.result.length > 0) {

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

                                    codRetenciones.push(objTipoCodImp);
                                }
                            }
                            log.debug("Suitlet Padron - Proceso Ppal", "Codigos de Retenciones: " + JSON.stringify(codRetenciones));                                   

                            //se consultan los codigos de impuesto
                            var filtrosCodImp = [];

                            var filtroTipoPadron = {};
                            filtroTipoPadron.name = "custrecord_l54_tipo_padron";
                            filtroTipoPadron.operator = "IS";
                            filtroTipoPadron.values = idTipoPadron; 
                            filtrosCodImp.push(filtroTipoPadron);                           
                            
                            var searchCodImpSet = util.searchSavedPro("customsearch_l54_padron_cod_imp",filtrosCodImp);
                            
                            var codImpuestos = [];

                            if (!searchCodImpSet.error && !util.isEmpty(searchCodImpSet.objRsponseFunction.result) && searchCodImpSet.objRsponseFunction.result.length > 0) {

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

                                    codImpuestos.push(objTipoCodImp);
                                }
                            }
                            log.debug("Suitlet Padron - Proceso Ppal", "Codigos de Impuesto: " + JSON.stringify(codImpuestos));                            

                            //se realiza la busqueda del codigo de Padron
                            var searchCodigoPadron = search.lookupFields({
                                type: "customrecord_l54_tipo_padron",
                                id: idTipoPadron,
                                columns: ["custrecord_l54_tipo_padron_codigo", "custrecord_l54_tipo_padron_ob_ti_co_ent"]
                            });

                            var codigoTipoPadron = util.isEmpty(searchCodigoPadron) ? idTipoPadron : searchCodigoPadron.custrecord_l54_tipo_padron_codigo;
                            var obtTipoInscripDesdeEntidad = (!util.isEmpty(searchCodigoPadron)) ? convertToBoolean(searchCodigoPadron.custrecord_l54_tipo_padron_ob_ti_co_ent) : false;
                            var periodo = util.isEmpty(searchCodigoPadron) ? idTipoPadron : searchCodigoPadron.custrecord_l54_tipo_padron_codigo;
                            
                            var busquedaTotal = (informacion.consulta_nuevos === "F" || informacion.consulta_nuevos == false || util.isEmpty(informacion.consulta_nuevos)) ? true : false;

                            var fieldCliente = "";
                            var fieldProveedor = "";
                            var periodoFormat = "";
                            var consultarClientes = true;

                            //En caso de busqueda parcial se generan los objetos para el filtro
                            if(!busquedaTotal){
                                fieldCliente = "custrecord_l54_pv_jc_cliente.custrecord_l54_pv_jc_tipo_padron";
                                fieldProveedor = "custrecord_l54_pv_jc_proveedor.custrecord_l54_pv_jc_tipo_padron";                   
                            }

                            var tipoConsultaPadronID = (informacion.tipo_consulta_padron ? informacion.tipo_consulta_padron : "");
                            log.debug("Suitlet Padron - tipoConsultaPadronID", tipoConsultaPadronID);   
                            
                            var  tipoConsultaPadron = {};

                            if (tipoConsultaPadronID){

                                tipoConsultaPadron = search.lookupFields({
                                    type: "customrecord_l54_tipo_consulta_padron",
                                    id: tipoConsultaPadronID,
                                    columns: [
                                        "custrecord_l54_tipo_consulta_padron_perc",
                                        "custrecord_l54_tipo_consulta_padron_rete"
                                    ]
                                });
                                log.debug("Suitlet Padron - tipoConsultaPadron", tipoConsultaPadron);                            

                            }

                            var aplicaProveedores = (tipoConsultaPadron.custrecord_l54_tipo_consulta_padron_rete ? true : false);
                            log.debug("Suitlet Padron - tipoConsultaPadron.custrecord_l54_tipo_consulta_padron_rete", tipoConsultaPadron.custrecord_l54_tipo_consulta_padron_rete);                            
                            var aplicaClientes = (tipoConsultaPadron.custrecord_l54_tipo_consulta_padron_perc ? true : false);
                            log.debug("Suitlet Padron - tipoConsultaPadron.custrecord_l54_tipo_consulta_padron_perc", tipoConsultaPadron.custrecord_l54_tipo_consulta_padron_perc);                            
                            //Percepciones(Cliente), Retenciones(Proveedor), Percepciones/Retenciones (Cliente + Proveedor)

                            var arrayCuitClientes = [];
                            var arrayCuitProveedores = [];

                            if (aplicaClientes){
                                log.debug("Suitlet Padron - Proceso Ppal", "Antes de ejecutar busquedas de IIBB Entidad Jurisdicción, Cliente y Proveedor: " + new Date());
                                var arrayIIBBEntidadJurisdiccionClientes = "";
                                if (!busquedaTotal) {
                                    arrayIIBBEntidadJurisdiccionClientes = obtenerIIBBEntidadJurisdiccion(idSubsidiary, consultarClientes, idTipoPadron);
                                    log.debug("Suitlet Padron - Proceso Ppal", "Despues de consultar SS IIBB Entidad Jurisdicción para Clientes: arrayIIBBEntidadJurisdiccionClientes.length: " + arrayIIBBEntidadJurisdiccionClientes.length + " - TIEMPO: " + new Date());
                                }

                                var arrayClientes = procesarArraysCuit(consultarClientes,arrayIIBBEntidadJurisdiccionClientes); //alex

                                if(informacion.automatico && !busquedaTotal){
                                    
                                    log.debug("Proceso de entidades Cliente Antes", "Longitud: " + arrayClientes.length + " Valores :" + arrayClientes)
                                    var arrEntitys = getEntitysPadron(consultarClientes);
                                    arrayClientes = arrayClientes.concat(arrEntitys);
                                    arrayClientes = [...new Set(arrayClientes)];

                                    log.debug("Proceso de entidades Cliente Despues", "Longitud: " + arrayClientes.length + " Valores :" + arrayClientes)
                                }
                               
                                log.debug("Suitlet Padron - Proceso Ppal", "Despues de consultar SS IIBB Entidad Jurisdicción para Clientes: arrayIIBBEntidadJurisdiccionClientes.length: " + arrayIIBBEntidadJurisdiccionClientes.length + " - TIEMPO: " + new Date());
                                var arrayCuitClientesAux = obtenerCuit(id_savedSearch_clientes, idSubsidiary, idTipoPadron, fieldCliente, consultarClientes, arrayClientes, busquedaTotal); // Se envía el id de la SS de la lista de clientes

                                log.debug("Suitlet Padron - Proceso Ppal", "Despues de consultar SS Cliente: arrayCuitClientesAux.length: " + arrayCuitClientesAux.length + " - TIEMPO: " + new Date());

                                arrayCuitClientes = unificarDataPadronesEntidades(arrayCuitClientesAux, idTipoPadron, busquedaTotal);

                                log.debug("Suitlet Padron - Proceso Ppal", "Despues de unificar padrones por entidad y clientes: arrayCuitClientes.length: " + arrayCuitClientes.length + " - TIEMPO: " + new Date());

                            }

                            if (aplicaProveedores) {
                                var arrayIIBBEntidadJurisdiccionProveedores = "";
                                consultarClientes = false;
                                if (!busquedaTotal) {
                                    arrayIIBBEntidadJurisdiccionProveedores = obtenerIIBBEntidadJurisdiccion(idSubsidiary, consultarClientes, idTipoPadron);
                                }
                                
                                var arrayProveedores = procesarArraysCuit(consultarClientes,arrayIIBBEntidadJurisdiccionProveedores);

                                if(informacion.automatico && !busquedaTotal){
                                    
                                    var arrEntitys = getEntitysPadron(consultarClientes);
                                    arrayProveedores = arrayProveedores.concat(arrEntitys);
                                    arrayProveedores = [...new Set(arrayProveedores)];

                                }

                                var arrayCuitProveedoresAux = obtenerCuit(id_savedSearch_proveedores, idSubsidiary, idTipoPadron, fieldProveedor, consultarClientes, arrayProveedores, busquedaTotal); // Se envía el id de la SS de la lista de proveedores

                                arrayCuitProveedores = unificarDataPadronesEntidades(arrayCuitProveedoresAux, idTipoPadron, busquedaTotal);

                            }

                            var arrayCUITS = arrayCuitClientes.concat(arrayCuitProveedores); //Se concatenan Clientes y Proveedores
                            var arrayAuxCuits = arrayCuitClientes.concat(arrayCuitProveedores); //Se concatenan Clientes y Proveedores

                            log.debug("Suitelet Padron", "LINE 353 - arrayCUITS: " + JSON.stringify(arrayCUITS));
                            log.debug("Suitlet Padron - Proceso Ppal", "Después de ejecutar busquedas de IIBB Entidad Jurisdicción, Cliente y Proveedor: " + new Date());

                            /*
                            arrayCUITS = arrayCUITS.filter(function(elem, index, self) { //Se eliminan CUIT duplicados de la union de Clientes y Proveedores (CUIT) (MUY LENTO)
                                return index == self.map(function(e){return e.cuit;}).indexOf(elem.cuit); }); //return index == self.indexOf(elem);
                            */
                            log.debug("Suitlet Padron - Proceso Ppal", "ID PERIODO: " + idPeriodo);
                            
                            if (!util.isEmpty(idPeriodo)) { 
                                var searchPeriodosPadron = search.load({
                                    id: "customsearch_l54_period_carga_padron"
                                });

                                var filtroidPeriodo = search.createFilter({
                                    name: "internalid",
                                    operator: search.Operator.IS,
                                    values: idPeriodo
                                });
                                searchPeriodosPadron.filters.push(filtroidPeriodo);

                                var resultSet = searchPeriodosPadron.run();

                                var searchResult = resultSet.getRange({
                                    start: 0,
                                    end: 1
                                });

                                if (!util.isEmpty(searchResult) && searchResult.length > 0)
                                {
                                    periodoFormat = searchResult[0].getValue({
                                        name: resultSet.columns[3]
                                    });

                                }
                                
                            }

                            arrayCUITS = arrayCUITS.reduce(function(a,b){return a.concat([b.cuit])}, []); //Concatena en un array solo los obj.cuit del array de objeto original

                            var jsonBody = new Object();
                            var header = new Object();
                            jsonBody.usuario = user_account;
                            jsonBody.password = password_account;
                            jsonBody.cuenta = numero_cuenta;
                            jsonBody.idTipoPadron = codigoTipoPadron;
                            jsonBody.subsidiaria = idSubsidiary[0];
                            jsonBody.cuits = "";
                            header["Content-Type"] = "text/xml";
                            header["Content-Length"] = "length";
                            
                            jsonBody.fechaDesdeNS = !util.isEmpty(periodoFormat) ? periodoFormat : "";

                            var paramScript = runtime.getCurrentScript().getParameter("custscript_3k_max_cuits_connection");
                            var ini = 0;
                            var maxLimiteCuits = !util.isEmpty(paramScript) ? paramScript : 10000;
                            var fin = maxLimiteCuits; //configurar como parametro en el script
                            var idNum = 1;
                            var padronesFinal = [];

                            log.audit("Suitlet Padron - Proceso Ppal", "Tipo Padron: " + codigoTipoPadron + "   -   Nuevas Entidades: " + !busquedaTotal + "   -   Limite de Cuits por conexion: " + maxLimiteCuits);

                            while (arrayCUITS.length > 0 && ini < arrayCUITS.length && objRespuesta.error != true) {

                                var arrayCuitsTemp = [];
                                var arrayCuitsTemp = arrayCUITS.slice(ini, fin);

                                jsonBody.cuits = arrayCuitsTemp.toString();
                                var xmlPost = "<?xml version=\"1.0\" encoding=\"utf-8\"?> " + 
                                                "<soap:Envelope xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" " + 
                                                    "xmlns:xsd=\"http://www.w3.org/2001/XMLSchema\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\"> " + 
                                                    "<soap:Body>" + 
                                                        "<consultaPadron xmlns=\"http://tempuri.org/\">" + 
                                                            "<solicitud>" + JSON.stringify(jsonBody) + "</solicitud>" + 
                                                        "</consultaPadron>" + 
                                                    "</soap:Body>" + 
                                                "</soap:Envelope>";

                                log.debug("Suitlet Padron - Proceso Ppal", "Solicitud xml a enviar: " + xmlPost);

                                log.debug("Suitlet Padron - Proceso Ppal", "Llamada nro." + idNum + " al Servidor (" + new Date() + ") - Pos Inicial: " + ini + " - Pos Final: " + fin + " - Tamaño array Consulta: " + arrayCuitsTemp.length);

                                var maxAttempts = parseInt(runtime.getCurrentScript().getParameter({ name: 'custscript_l54_max_attempts'})) || 5;

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

                                log.debug("Suitlet Padron - Proceso Ppal", "Codigo de Respuesta de conexion: " + JSON.stringify(response.code));

                                if (response.code == 200) {

                                    if (!util.isEmpty(response.body)) { 

                                        var xmlDocument = xml.Parser.fromString({
                                            text: response.body
                                        });

                                        var nodes = xml.XPath.select({
                                            node: xmlDocument,
                                            xpath: "//*[name()=\"consultaPadronResult\"]"
                                        })

                                        if (nodes.length > 0) {

                                            var err = xml.XPath.select({
                                                node: xmlDocument,
                                                xpath: "//*[name()=\"error\"]"
                                            })

                                            var msj = xml.XPath.select({
                                                node: xmlDocument,
                                                xpath: "//*[name()=\"mensaje\"]"
                                            });                                        

                                            var errBool = (err[0].textContent === "true");

                                            var padronConsulta = [];

                                            if (errBool == false) {
                                                var arrayPadron = new Array();

                                                var padronesNodes = xml.XPath.select({
                                                    node: xmlDocument,
                                                    xpath: "//*[name()=\"informacionRespuesta\"]"
                                                });

                                                if(!util.isEmpty(padronesNodes[0].textContent)) {
                                                    padronConsulta = JSON.parse(padronesNodes[0].textContent);
                                                    log.debug("Suitlet Padron - Proceso Ppal", "Respuesta de llamada nro." + idNum + " al Servidor (" + new Date() + ") - Tamaño array respuesta: " + padronConsulta.length);
                                                    padronesFinal = padronesFinal.concat(padronConsulta);
                                                }
                                                else {
                                                    objRespuesta.error = false;
                                                    objRespuesta.mensaje = "No se encontraron resultados!";
                                                }
                                            } else {
                                                objRespuesta.error = true;
                                                objRespuesta.mensaje = "Asegurece que todas las subsidiarias seleccionadas esten dadas de alta.";
                                            }                                        
                                        }
                                    }
                                } else {
                                    objRespuesta.error = true;
                                    objRespuesta.mensaje = "Error Conectando - Servidor no disponible.";
                                    log.error("Suitlet Padron - Error", "Error Conectando - Servidor no disponible: " + JSON.stringify(response));
                                }

                                ini = ini + maxLimiteCuits;
                                fin = fin + maxLimiteCuits;
                                idNum++;                                
                            }
                            log.audit("Suitlet Padron - Proceso Ppal", "Respuesta del Servidor contiene: " + padronesFinal.length + " CUIT(s)");
                            log.audit("Suitlet Padron - Proceso Ppal", "Respuesta del Servidor - Padrones Final: " + JSON.stringify(padronesFinal));
                            log.audit("Suitlet Padron - Proceso Ppal", "Valores de codigoTipoPadron: " + codigoTipoPadron + " - tiposContrib: " + JSON.stringify(tiposContrib));

                            //INICIO - Generar File y Enviar Task Map/Reduce--------------------------------------------------------------------------------------------------------------------
                            if(!util.isEmpty(padronesFinal) && padronesFinal.length > 0 && objRespuesta.error != true){
                                log.debug("Suitelet Padron", "LINE 535 - arrayAuxCuits: " + JSON.stringify(arrayAuxCuits));

                                for(var i = 0; i < padronesFinal.length; i++){
                                    var arrayContrib = tiposContrib.filter(function(obj) {return (obj.tipoPadron == codigoTipoPadron && obj.subTipoPadron == padronesFinal[i].subTipoPadron && obj.codigo == padronesFinal[i].codContrib);});
                                    padronesFinal[i].idContrib = (arrayContrib.length > 0) ? arrayContrib[0].id : "";

                                    if (obtTipoInscripDesdeEntidad && arrayAuxCuits.length > 0) {
                                        var arrayCuitTipoContrib = arrayAuxCuits.filter(function (obj) {
                                            return (obj.cuit == padronesFinal[i].cuit)
                                        });
                                        
                                        padronesFinal[i].idContrib = (arrayCuitTipoContrib.length > 0) ? arrayCuitTipoContrib[0].idContrib : "";
                                    }
                                    
                                    delete padronesFinal[i].codContrib;
                                    //delete padronesFinal[i].tipoPadron;
                                }
                                //log.debug("Suitlet Padron - Proceso Ppal", "Despues de modificar el array padron final: " + new Date());

                                if(!informacion.automatico){
                                    var searchAux = search.lookupFields({
                                        type: "customrecord_l54_tipo_padron",
                                        id: idTipoPadron,
                                        columns: ["custrecord_l54_tipo_padron_jurisdiccion"]
                                    });
                                    informacion.jurisdiccion = searchAux.custrecord_l54_tipo_padron_jurisdiccion[0].value;
                                }

                                for (let j = 0; j < padronesFinal.length; j++) {
                                    padronesFinal[j].jurisdiccion = informacion.jurisdiccion;
                                    
                                }

                                var mitad = Math.ceil(arrayCuitClientes.length / 2); // Calcula la mitad del tamaño del array
                                var primeraMitad = arrayCuitClientes.slice(0, mitad); // Obtiene la primera mitad del array
                                var segundaMitad = arrayCuitClientes.slice(mitad); // Obtiene la segunda mitad del array

                                var idFile = [];

                                var respuestaFinal1 = {
                                    padron: padronesFinal,
                                    clientes: primeraMitad,
                                    proveedores: []
                                };
                                var respuestaFinal2 = {
                                    padron: [],
                                    clientes: segundaMitad,
                                    proveedores: []
                                };
                                var respuestaFinal3 = {
                                    padron: [],
                                    clientes: [],
                                    proveedores: arrayCuitProveedores
                                };
                                
                                var respuestaFinalCad1 = JSON.stringify(respuestaFinal1);
                                var respuestaFinalCad2 = JSON.stringify(respuestaFinal2);
                                var respuestaFinalCad3 = JSON.stringify(respuestaFinal3);

                                var filePadron1 = file.create({
                                    name: jsonBody.cuenta + "_" + jsonBody.subsidiaria + "_" + idTipoPadron + "_1",
                                    fileType: file.Type.PLAINTEXT,
                                    contents: respuestaFinalCad1,
                                    folder: carpeta
                                });
                                
                                idFile.push(filePadron1.save());

                                var filePadron2 = file.create({
                                    name: jsonBody.cuenta + "_" + jsonBody.subsidiaria + "_" + idTipoPadron + "_2",
                                    fileType: file.Type.PLAINTEXT,
                                    contents: respuestaFinalCad2,
                                    folder: carpeta
                                });
                                
                                idFile.push(filePadron2.save());

                                var filePadron3 = file.create({
                                    name: jsonBody.cuenta + "_" + jsonBody.subsidiaria + "_" + idTipoPadron + "_3",
                                    fileType: file.Type.PLAINTEXT,
                                    contents: respuestaFinalCad3,
                                    folder: carpeta
                                });
                                
                                idFile.push(filePadron3.save());

                                log.audit("Suitlet Padron - Proceso Ppal", "Id Archivo txt: " + JSON.stringify(idFile));
                                log.audit("Codigo impuestos enviados", "Cod Impuestos: " + JSON.stringify(codImpuestos));
                                log.audit("Codigo retencion enviados", "Cod Retenciones: " + JSON.stringify(codRetenciones));

                                if(!utilities.isEmpty(informacion.email)){
                                    var idUser = informacion.email;
                                }else{
                                    var idUser = runtime.getCurrentUser().id;
                                }

                                var jurisdiccion = informacion.automatico ? informacion.jurisdiccion : "";

                                var taskMap = task.create({
                                    taskType: task.TaskType.MAP_REDUCE,
                                    scriptId: "customscript_l54_carga_padron_map",
                                    //deploymentId: "customdeploy_l54_carga_padron_map",
                                    params: {
                                        "custscript_3k_file_new": JSON.stringify(idFile),
                                        "custscript_3k_id_tipo_padron": idTipoPadron,
                                        "custscript_3k_id_periodo": idPeriodo,
                                        "custscript_3k_padron_total": busquedaTotal,
                                        "custscript_3k_id_subsidiaria": idSubsidiary,
                                        "custscript_3k_id_user": idUser,
                                        "custscript_3k_cod_impuestos": JSON.stringify(codImpuestos),
                                        "custscript_3k_cod_retenciones": JSON.stringify(codRetenciones),
                                        "custscript_3k_aplica_clientes": aplicaClientes,
                                        "custscript_3k_aplica_proveedores": aplicaProveedores,
                                        "custscript_3k_jurisdiccion": jurisdiccion,
                                    }
                                });

                                var taskId = taskMap.submit();
                                
                                objRespuesta.taskid = taskId;
                                
                                objRespuesta.mensaje = "FIN Consulta - " + padronesFinal.length + " CUITS Encontrados<br> Inicia el procesamiento en Netsuite, se le informará por email al finalizar.";

                                log.audit("Suitlet Padron - Proceso Ppal", "Se invocó el Map/Reduce Exitosamente! ");
                                
                            } else{
                                //** Modificación Padron Automatico**/
                                log.debug("objRespuesta", JSON.stringify(objRespuesta))
                                if(informacion.automatico && objRespuesta.error != true){
                                    var mitad = Math.ceil(arrayCuitClientes.length / 2); // Calcula la mitad del tamaño del array
                                    var primeraMitad = arrayCuitClientes.slice(0, mitad); // Obtiene la primera mitad del array
                                    var segundaMitad = arrayCuitClientes.slice(mitad); 
                                    
                                    updateEntitys(primeraMitad, "customer"); 
                                    updateEntitys(segundaMitad, "customer");
                                    updateEntitys(arrayCuitProveedores, "vendor");
                                }
                                
                                objRespuesta.error = true;
                                objRespuesta.mensaje = util.isEmpty(objRespuesta.mensaje) ? "Error inesperado en la conexion con el Servidor!" : objRespuesta.mensaje;                                             
                            }
                            //FIN - Generar File y Enviar Task Map/Reduce--------------------------------------------------------------------------------------------------------------------
                            
                        } else {
                            objRespuesta.error = true;
                            objRespuesta.mensaje = "No se encontró información de Configuración Padrón IIBB";
                        }
                    } else {
                        objRespuesta.error = true;
                        objRespuesta.mensaje = "Debe completar La subsidiaria."
                    }
                } else {
                    objRespuesta.error = true;
                    objRespuesta.mensaje = "No se recibió parámetro de carga padrón."
                }
                log.debug("Proceso Programado", "objRespuesta a devolver: " + JSON.stringify(objRespuesta));
                log.audit("Governance Monitoring", "LINE 609 - Remaining Usage = " + runtime.getCurrentScript().getRemainingUsage() + " --- time: " + new Date());
                
                if(objRespuesta.error){
                    sendEmail(objRespuesta.mensaje, informacion.email)
                }
                
                return objRespuesta;

            } catch (e) {

                log.error("Suitlet Padron - Error", "Error consultando Padrones: " + e.message);
                objRespuesta.error = true;
                objRespuesta.mensaje = e.message;

                return objRespuesta;
            }
        }

        function updateEntitys(paramArr, paramEntity){
            var entity = paramEntity;
            if(paramArr.length != 0){
                for (let j = 0; j < paramArr.length; j++) {
                    var arrIDS = paramArr[j].id.split(",");
                    for (let i = 0; i < arrIDS.length; i++){
                        var objEntity = record.load({
                            type:entity,
                            id: arrIDS[i], 
                            isDynamic: false
                        })      
                        objEntity.setValue("custentity_l54_padron_cargado", true)
                        objEntity.save({
                            enableSourcing: false,
                            ignoreMandatoryFields : true
                        })  
                    }
                }
            }
        }

        function sendEmail(paramMessage, emailAut){
            if(!utilities.isEmpty(emailAut)){
                var idUser = emailAut;
            }else{
                var idUser = runtime.getCurrentUser().id;
            }
            
            var author = idUser,
                recipients = idUser,
                subject = "Proceso Carga Padron";

            var body = "Estimado(a) : \n" +
                        "Se ha generado un error al intentar ejecutar el proceso Carga Padron \n" +
                        "Mensaje de Error: " +paramMessage + "\n" +
                        "Atentamente. \n \n" +
                        "***NO RESPONDA A ESTE MENSAJE***";

            email.send({
                author: author,
                recipients: recipients,
                subject: subject,
                body: body
            });
        }

        function convertToBoolean(string) {

            return ((util.isEmpty(string) || string == "F" || string == false) ? false : true);
        }
        
        // Función para buscar los registros de padrón que posee cada cliente/proveedor registrado en su perfil
        function obtenerIIBBEntidadJurisdiccion(idSubsidiary, consultarClientes, idPadron) {

            try {
                log.debug("obtenerIIBBEntidadJurisdiccion", "INICIO - obtenerIIBBEntidadJurisdiccion");
                log.debug("obtenerIIBBEntidadJurisdiccion", "Parámetros - idSubsidiary: " + idSubsidiary + " - consultarClientes: " + consultarClientes + " - idPadron: " + idPadron);

                var arrayResultadosIIBB = [];

                var searchIIBBEntidadJurisdiccion = search.load({
                    id: "customsearch_l54_iibb_ent_jurisd_padron"
                });

                // Filtro subsidiaria
                if(!util.isEmpty(idSubsidiary)){
                    var filtroSubsidiaria = search.createFilter({
                        name: "custrecord_l54_pv_jc_subsidiaria",
                        operator: search.Operator.ANYOF,
                        values: idSubsidiary
                    });
                    searchIIBBEntidadJurisdiccion.filters.push(filtroSubsidiaria);
                }

                // Consulto por clientes solamente
                if (!util.isEmpty(consultarClientes) && consultarClientes) {
                    // Filtro Cliente (no vacío)
                    var filtroCliente = search.createFilter({
                        name: "formulatext",
                        formula: "{custrecord_l54_pv_jc_cliente}",
                        operator: search.Operator.ISNOTEMPTY
                    });
                    searchIIBBEntidadJurisdiccion.filters.push(filtroCliente);

                    // Filtro Proveedor (vacío)
                    var filtroProveedor = search.createFilter({
                        name: "formulatext",
                        formula: "{custrecord_l54_pv_jc_proveedor}",
                        operator: search.Operator.ISEMPTY
                    });
                    searchIIBBEntidadJurisdiccion.filters.push(filtroProveedor);
                } else { // Consulto por Proveedores solamente
                    // Filtro Cliente (vacío)
                    var filtroCliente = search.createFilter({
                        name: "formulatext",
                        formula: "{custrecord_l54_pv_jc_cliente}",
                        operator: search.Operator.ISEMPTY
                    });
                    searchIIBBEntidadJurisdiccion.filters.push(filtroCliente);

                    // Filtro Proveedor (no vacío)
                    var filtroProveedor = search.createFilter({
                        name: "formulatext",
                        formula: "{custrecord_l54_pv_jc_proveedor}",
                        operator: search.Operator.ISNOTEMPTY
                    });
                    searchIIBBEntidadJurisdiccion.filters.push(filtroProveedor);
                }

                if (!util.isEmpty(idPadron)) {
                    var filtroPadron = search.createFilter({
                        name: "custrecord_l54_pv_jc_tipo_padron",
                        operator: search.Operator.ANYOF,
                        values: idPadron
                    });
                    searchIIBBEntidadJurisdiccion.filters.push(filtroPadron);
                }

                var resultSearch = searchIIBBEntidadJurisdiccion.run();
                var completeResultSet = [];
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set
                var longitudResultado = 0;

                do {
                    longitudResultado = resultIndex + resultStep;
                    // fetch one result set
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });
                    //log.audit("searchSaved", "resultSearch: "+resultado.length);
                    if (!util.isEmpty(resultado) && resultado.length > 0) {
                        if (resultIndex == 0)
                            completeResultSet = resultado;
                        else
                            completeResultSet = completeResultSet.concat(resultado);
                    }

                    // increase pointer
                    resultIndex = resultIndex + resultStep;

                } while (!util.isEmpty(resultado) && resultado.length > 0 )
                
                // log.debug("obtenerIIBBEntidadJurisdiccion", "Resultados - completeResultSet" + JSON.stringify(completeResultSet));

                if(!util.isEmpty(completeResultSet) && completeResultSet.length > 0){
                    for (var i = 0; i < completeResultSet.length; i++){
                        var objInfo = {};

                        objInfo.cuit = completeResultSet[i].getValue({ name: resultSearch.columns[0] });
                        objInfo.padronesPorEntidad = completeResultSet[i].getValue({ name: resultSearch.columns[1] });
                        objInfo.idInternoClientes = completeResultSet[i].getValue({ name: resultSearch.columns[3] });
                        objInfo.idInternoProveedores = completeResultSet[i].getValue({ name: resultSearch.columns[4] });
                        arrayResultadosIIBB.push(objInfo);
                    }
                } else {
                    log.debug("obtenerIIBBEntidadJurisdiccion", "No se encontraron resultados de registros en IIBB entidad Jurisdicción para Clientes " + consultarClientes);
                }
                
                log.debug("obtenerIIBBEntidadJurisdiccion", "FIN - obtenerIIBBEntidadJurisdiccion: " + JSON.stringify(arrayResultadosIIBB));
                return arrayResultadosIIBB;
            } catch (e) {
                log.error("obtenerIIBBEntidadJurisdiccion", "Error al obtener registros de Padrón - Netsuite Excepción: " + e.message);
                return null;
            }
        }

        function getEntitysPadron(flagClientes){
            var arrResult = [];
            if(flagClientes){
                var ss_id = "customsearch_l54_clientes_padron_cargado";
            }else{
                var ss_id = "customsearch_l54_prov_padron_cargado";
            }

            var objSearch = utilities.searchSavedPro(ss_id, null);

            if (objSearch.error) {
                log.error("Funcion getEntitysPadron", "Error en consulta de SS " + ss_id + ". Mensaje: " + JSON.stringify(objSearch.msj));
            }

            var resultSet = objSearch.objRsponseFunction.result;
            var resultSearch = objSearch.objRsponseFunction.search;

            if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {
                for (var i = 0; i < resultSet.length; i++) {
                    var col0 = resultSet[i].getValue({ name: resultSearch.columns[0]});

                    arrResult.push(col0)
                }
            } else {
                log.audit("Funcion getEntitysPadron", "Sin información");
            }

            return arrResult;
        }



        // funcion para extraer todos los ids dependiendo de cliente o Proveedor
        function procesarArraysCuit(flagClientes,arrayDatos) {
            var arrayResultado = new Array();
            for(var i=0;i<arrayDatos.length;i++){
                var tempValue="";
                if(flagClientes){
                    tempValue = arrayDatos[i].idInternoClientes;
                }else{
                    tempValue = arrayDatos[i].idInternoProveedores;
                }
                if(!util.isEmpty(tempValue)){
                    if(tempValue.indexOf(",") != -1){
                        var idsInternos = tempValue.split(",");
                        for(var j=0;j<idsInternos.length;j++){
                            if(arrayResultado.indexOf(idsInternos[j]) == -1){
                                arrayResultado.push(idsInternos[j]);
                            }
                        }
                    }else{
                        if(arrayResultado.indexOf(tempValue) == -1){
                            arrayResultado.push(tempValue);
                        }
                    }
                }
            }
            log.debug("Array Resultado", arrayResultado);
            return arrayResultado;
        }
        // Función que permite unificar la información de clientes/proveedores con los datos de tipo padrón que tienen asignados.
        function unificarDataPadronesEntidades(arrayEntidades, idPadron, busquedaTotal) {

            try {
                log.debug("unificarDataPadronesEntidades", "INICIO - unificarDataPadronesEntidades");
                log.debug("unificarDataPadronesEntidades", "Parámetros - arrayEntidades: " + JSON.stringify(arrayEntidades) + " - idPadron: " + idPadron + " - busquedaTotal: " + busquedaTotal);
                var resultadoUnificado = [];

                // Verifico que existan entidades a recorrer para 
                if (!util.isEmpty(arrayEntidades) && arrayEntidades.length > 0) {
                    for (var i = 0; i < arrayEntidades.length; i++) {
                        resultadoUnificado.push({ "id": arrayEntidades[i].idInternoEntidades, "cuit": arrayEntidades[i].cuit, "idContrib": arrayEntidades[i].idContrib, "subsidiaria": arrayEntidades[i].subsidiary });
                    }
                } else {
                    log.debug("unificarDataPadronesEntidades", "No existen valor del Array de Entidades - No se unifica nada");
                }

                log.debug("unificarDataPadronesEntidades", "FIN - resultadoUnificado: " + JSON.stringify(resultadoUnificado));
                return resultadoUnificado;
            } catch (e) {
                log.error("unificarDataPadronesEntidades", "Error al Unificar Entidades y Padrones - Netsuite Excepción: " + e.message);
                return null;
            }
        }
        function obtenerCuit(id_SS_customer, idSubsidiary, idPadron, field, consultarClientes, arrayResultados, busquedatotal) { //tipo, idTipoPadron

            try {
                log.audit("obtenerCuit", "INICIO - obtenerCuit");
                log.audit("obtenerCuit", "Parámetros - id_SS_customer: " + id_SS_customer + " - idSubsidiary: " + idSubsidiary + " - idPadron: " + idPadron + " - consultarClientes: " + consultarClientes);
                var result = [];

                if (!util.isEmpty(id_SS_customer)) {
                    
                    if(consultarClientes){
                        var searchCUITCantidad = search.load({
                            id: "customsearch_l54_iibb_cli_act_pad_cant" 
                        });
                    }else{
                        var searchCUITCantidad = search.load({
                            id: "customsearch_l54_iibb_prov_act_pad_cant" 
                        });
                    }
                    
                    var filtroS = searchCUITCantidad.filterExpression;
                    
                    // Filtro Subsidiaria
                    if (!util.isEmpty(idSubsidiary)) {
                        if (consultarClientes) { // Verifico si se consultan los clientes para filtrar por el campo Subsidiaria
                            filtroS.push("AND");
                            filtroS.push(["subsidiary", search.Operator.ANYOF, idSubsidiary]);
                        } else { // Verifico si se consultan los proveedores para filtrar por la lista msesubsidiary
                            filtroS.push("AND");
                            filtroS.push(["msesubsidiary.internalid", search.Operator.ANYOF, idSubsidiary]);
                        }
                    }

                    searchCUITCantidad.filterExpression = filtroS;
                    var resultSearch = searchCUITCantidad.run();
                    var searchResult = resultSearch.getRange({
                        start: 0,
                        end: 1
                    });
                    var cantidadTotal = 0;
                    if (!util.isEmpty(searchResult) && searchResult.length > 0) {
                        cantidadTotal = parseInt(searchResult[0].getValue({
                            name: resultSearch.columns[0]
                        }));
                    }

                    // var new_url = url.resolveScript({
                    //     scriptId: "customscript_l54_busqueda_aux_cuit",
                    //     deploymentId: "customdeploy_l54_busqueda_aux_cuit",
                    //     returnExternalUrl: true
                    // });

                    var completeResultSet = [];
                    var resultIndex = 0;
                    var resultStep = 6000; // Number of records returned in one step (maximum is 5000)
                    var contador = 1;
                    do {
                        // fetch one result set
                        var parametros = new Object();
                        parametros.id_SS = id_SS_customer;
                        parametros.idSubsidiary = JSON.stringify(idSubsidiary);
                        parametros.idPadron = idPadron;
                        parametros.consultarClientes = consultarClientes;
                        parametros.busquedatotal = busquedatotal;
                        parametros.arrayResultados = JSON.stringify(arrayResultados);
                        parametros.resultIndex = resultIndex;
                        parametros.resultQuantity = resultStep;
                        parametros.contador = contador;

                        try {
                            // var respuestaAux = https.post({
                            //     url: new_url,
                            //     body: parametros
                            // });

                            let myRestletHeaders = new Array();
                                myRestletHeaders['Accept'] = '*/*';
                                myRestletHeaders['Content-Type'] = 'application/json';
                            var respuestaAux = https.requestRestlet({
                                scriptId: 'customscript_l54_busqueda_aux_cuit_rl',
                                deploymentId: 'customdeploy_l54_busqueda_aux_cuit_rl',
                                method: https.Method.POST,
                                body: JSON.stringify(parametros),
                                headers: myRestletHeaders,
                            });
                            
                            if (!util.isEmpty(respuestaAux)) {
    
                                var respuesta = JSON.parse(respuestaAux.body);
                                if (!util.isEmpty(respuesta) && respuesta.length > 0) {
                                    var informacionRespuesta = respuesta[0];
                                    var resultado = informacionRespuesta.respuesta[0];
                                }
                            }
    
                            if (resultIndex == 0)
                                result = resultado;
                            else
                                result = result.concat(resultado);
                            // increase pointer
    
                            resultIndex = resultIndex + resultStep;
                            contador++;
                        } catch (error) {
                            log.error('obtenerCuitCatch', 'Detalle Excepcion / Error al consultar el suitelet de cuits: ' + JSON.stringify(error));
                        }

                    } while (cantidadTotal > resultIndex)
                    // Fin de SS y procesamiento de resultados para la Configuración de Padrón

                } else {
                    log.error("obtenerCuit", "ID de la Saved Search erróneo");
                }
                
                log.debug("obtenerCuit", "FIN - obtenerCuit: " + JSON.stringify(result));

                return result;
                
            } catch (e) {
                log.error("obtenerCuit", "Error al Obtener CUITs - Netsuite Excepción: " + e.message);
            }
        }


        return {
            execute: execute
        };

    });