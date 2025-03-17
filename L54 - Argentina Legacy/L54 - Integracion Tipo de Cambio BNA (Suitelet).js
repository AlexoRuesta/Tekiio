/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(
    [
        "N/ui/serverWidget", "N/xml", "N/file", "N/https", "N/record", "N/error", "N/search", "N/format", "N/task", "N/runtime", "L54/utilidades", "N/ui/dialog"
    ],
    function (serverWidget, xml, file, https, record, error, search, format, task, runtime, utilidades, dialog) {
        /* global define log */
        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {

            const proceso = "onRequest";

            try {
                const currentScript = runtime.getCurrentScript();

                var form = serverWidget.createForm({
                    title: "Consulta de Tipo de Cambio BNA"
                });

                form.clientScriptModulePath = "./L54 - Integracion Tipo de Cambio BNA (Cliente).js";

                log.debug(proceso, "INICIO Dibujando SuiteLet");

                //DIBUJAR FIELDGROUPS, TABS y SUBTABS
                var grupoFiltros = form.addFieldGroup({
                    id: "fgfiltros",
                    label: "Filtros de Búsqueda"
                });

                var tabDetalle = form.addTab({
                    id: "tabdetalle",
                    label: "Detalle"
                });

                var subTabCargos = form.addSubtab({
                    id: "subtabmonedas",
                    label: "Lista de Monedas Servicio Web BNA",
                    tab: "tabdetalle"
                });

                // DIBUJA CAMPOS
                var actionfield = form.addField({
                    id: "custpage_accion",
                    label: "Accion:",
                    type: serverWidget.FieldType.TEXT,
                    container: "fgfiltros"
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });

                var fecha = form.addField({
                    id: "custpage_fecha",
                    label: "Fecha Actual",
                    type: serverWidget.FieldType.DATE,
                    container: "fgfiltros"
                });

                // if (permitirCambioFecha == 'F' || permitirCambioFecha == false) {
                fecha.updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });
                // }

                if (utilidades.isEmpty(context.request.parameters.custpage_fecha)) {
                    //Set date value for today
                    fecha.defaultValue = format.format({
                        value: obtenerFechaServidor("HOY"),
                        type: format.Type.DATE
                    });
                } else {
                    fecha.defaultValue = context.request.parameters.custpage_fecha;
                }
                // FIN CAMPOS

                // DIBUJA SUBLISTAS
                var sublistMonedas = form.addSublist({
                    id: "listadomonedas",
                    type: serverWidget.SublistType.LIST,
                    label: "Listado de Monedas",
                    tab: "subtabmonedas"
                });

                sublistMonedas.addField({
                    id: "moneda",
                    label: "Moneda",
                    type: serverWidget.FieldType.TEXT
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                });

                sublistMonedas.addField({
                    id: "tipodecambio",
                    type: serverWidget.FieldType.FLOAT,
                    label: "Tipo de Cambio"
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                });
                // FIN SUBLISTA

                //DIBUJA BOTONES
                form.addSubmitButton({
                    label: "Actualizar Tipos de Cambio"
                });

                form.addButton({
                    id: "custpage_btnconsultar",
                    label: "Consultar Tipos de Cambio BNA",
                    functionName: "consultarTipoCambio"
                });
                //FIN BOTON

                var grupoResultados = form.addFieldGroup({
                    id: "fgresultados",
                    label: "Resultados"
                });

                //Visualizar resultados
                var infoResultado = form.addField({
                    id: "custpage_resultado",
                    label: "Resultados",
                    type: serverWidget.FieldType.INLINEHTML,
                    container: "fgresultados"
                });

                if (context.request.method === "GET") {

                    log.audit(proceso, "FIN Proceso GET");
                    context.response.writePage(form);

                } else {
                    var accion = utilidades.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;

                    log.debug(proceso, "POST accion: " + accion);

                    //Anidamos los ifs porque el llamado de las funciones dependen del reultado de la anterior.

                    if (accion == "ACTUALIZAR" || accion == "CONSULTAR") {


                        const config = obtenerConfiguracionBNA();
                        let emailEmployee = "";
                        let idEmployee = "";

                        if (!config.error) {

                            const urlservicio = config.config.urlservicio;
                            const monedas = config.monedas;
                            const consulta = consultarServicioBNA(urlservicio, monedas);
                            const idCarpeta = config.config.idCarpeta;
                            emailEmployee = config.config.emailEmployee;
                            idEmployee = config.config.idEmployee;

                            if (!consulta.error) {
                                const monedasActualizar = consulta.monedasActualizar;
                                log.debug(proceso, "monedasActualizar: " + JSON.stringify(monedasActualizar));

                                switch (accion) {
                                    case "ACTUALIZAR":
                                        var update = actualizarTipoCambio(monedasActualizar, idCarpeta, idEmployee);
                                        if (update.error) {
                                            log.error(proceso, update.mensaje);
                                            infoResultado.defaultValue = "<font color=\"red\">" + update.mensaje + "</font>";
                                        } else {
                                            infoResultado.defaultValue = "<font color=\"blue\">Ha iniciado el proceso de actualización de tipos de cambio en NetSuite. Al culminar se notificará por email los resultados obtenidos.</font>";
                                        }
                                        break;
                                    case "CONSULTAR":
                                        listarMonedas(sublistMonedas, monedasActualizar);
                                        break;
                                }
                            } else {
                                log.error(proceso, consulta.mensaje);
                                infoResultado.defaultValue = "<font color=\"red\">" + consulta.mensaje + "</font>";
                            }
                        } else {
                            log.error(proceso, config.mensaje);
                            infoResultado.defaultValue = "<font color=\"red\">" + config.mensaje + "</font>";
                        }


                        context.response.writePage(form);
                    }
                }
            } catch (er) {
                const mensaje = "Excepcion Proceso Generacion de " + proceso + " - Excepcion : " + er.message;
                log.error(proceso, mensaje);
            }
        }

        /** 
         * @param {string}   urlservicio    A hyperlink specifying the webservice
         * @param {array}    monedasConsultar    An array of objects with all available currencies for the service
         * 
         * @return {object}  return         An object with the following properties
         * @return {boolean} return.error   True on error
         * @return {string}  return.mensaje An error message if there is any
         * @return {string}  return.monedasActualizar Array with the information of currenciees to update
         */
        function consultarServicioBNA(urlservicio, monedasConsultar) {

            const proceso = "consultarServicioBNA";
            const response = { error: false, mensaje: "", monedasActualizar: [] };

            log.audit(proceso, "Inicio - Consulta Servicio Tipos de Cambios BNA - URL : " + urlservicio + " - Monedas : " + JSON.stringify(monedasConsultar));

            try {
                //Consulta tipos de cambios al servicio web
                let request = "";
                let errorHttp = false;
                let errorHttps = false;
                let mensajeErrorHttp = "";

                try {
                    request = https.get({
                        url: urlservicio
                    });
                } catch (error) {
                    if (error.name == "SSS_INVALID_URL") {
                        errorHttps = true;
                    }
                    mensajeErrorHttp = "Error al consultar por https al sitio web del BNA - Detalles: " + JSON.stringify(error);
                    log.error(proceso, mensajeErrorHttp);
                }

                try {
                    if (errorHttps) {
                        request = http.get({
                            url: urlservicio
                        });
                    }
                } catch (error) {
                    errorHttp = true;
                    mensajeErrorHttp = "Error al consultar por http al sitio web del BNA - Detalles: " + JSON.stringify(error);
                    log.error(proceso, mensajeErrorHttp);
                }

                if (!utilidades.isEmpty(request) && !errorHttp) {
                    log.audit(proceso, "INICIO procesamiento de HTML por consulta Servicio Tipos de Cambios BNA");
                    let objResp = request.body;
                    log.debug(proceso, "content html: " + JSON.stringify(objResp));
                    objResp = objResp.replace(/(?:\r\n|\r|\n|\t)/g, "");

                    if (!utilidades.isEmpty(objResp)) {

                        /**
                         * Como cada moneda puede solicitar informacion de una tabla distinta, hay que obtener todas las tablas, que haya por moneda.
                         */
                        const idDivs = [...new Set(monedasConsultar.map(moneda => moneda.idContenedorHtml))];

                        const datosFinales = idDivs.map(idDiv => {
                            const regex = new RegExp(`<div.*?id="${idDiv}".*?>[^]*?(<table .*?>[^]*?<\/table>)[^]*?<\/div>`);
                            const match = regex.exec(objResp);
                            const datos = match[1];
                            if (utilidades.isEmpty(datos)) {
                                log.debug(proceso, "no hay tabla con el ID: " + idDiv);
                            }
                            return { idContenedorHtml: idDiv, xmlString: datos };
                        });


                        if (!utilidades.isEmpty(datosFinales)) {

                            const xmlRespuestas = datosFinales.map(o => {
                                const xmlRespuesta = xml.Parser.fromString({
                                    text: o.xmlString
                                });
                                return { idContenedorHtml: o.idContenedorHtml, xml: xmlRespuesta };
                            });


                            if (!utilidades.isEmpty(xmlRespuestas)) {

                                const arrayXMLNodosTD = xmlRespuestas.map(objXml => {
                                    const arrayNodosTD = xml.XPath.select({
                                        node: objXml.xml,
                                        xpath: "//*[name()='td']"
                                    });
                                    return { idContenedorHtml: objXml.idContenedorHtml, arrayNodosTD: arrayNodosTD };
                                });

                                const noVacioCheck = arrayXMLNodosTD.every(arrayNodosTD => {
                                    return !utilidades.isEmpty(arrayNodosTD.arrayNodosTD) && arrayNodosTD.arrayNodosTD.length > 0;
                                });

                                if (noVacioCheck) {

                                    log.debug(proceso, "arrayNodosTD: " + JSON.stringify(arrayXMLNodosTD));

                                    const arrayXMLFinalTD = arrayXMLNodosTD.map(arrayNodos => {
                                        const arrayFinalTD = [];
                                        arrayNodos.arrayNodosTD.forEach((element, index) => {
                                            element.textContent = element.textContent.toUpperCase();
                                            element.textContent = element.textContent.replace(/(?:\r\n|\r|\n|\t)/g, "");
                                            element.textContent = element.textContent.replace(/&nbsp/g, " ");
                                            element.indice = index;
                                            arrayFinalTD.push(element);
                                        });
                                        return { idContenedorHtml: arrayNodos.idContenedorHtml, arrayFinalTD: arrayFinalTD };
                                    });

                                    log.debug(proceso, "arrayFinalTD: " + JSON.stringify(arrayXMLFinalTD));

                                    for (let i = 0; i < monedasConsultar.length; i++) {

                                        monedasConsultar[i].errorConsultando = false;
                                        monedasConsultar[i].mensajeError = "";

                                        const arrayFinalTD = arrayXMLFinalTD
                                            .find(arrayFinalTD => arrayFinalTD.idContenedorHtml == monedasConsultar[i].idContenedorHtml).arrayFinalTD;

                                        const resultadoMoneda = arrayFinalTD.filter((obj) => {
                                            return obj.textContent == monedasConsultar[i].nombreTagHTML;
                                        });

                                        log.debug(proceso, "resultadoMoneda: " + JSON.stringify(resultadoMoneda));

                                        if (!utilidades.isEmpty(resultadoMoneda) && resultadoMoneda.length > 0) {

                                            // se busca el tipo de cambio de venta del dolar en el BNA, este se ubica dos posiciones despues del TAG "Dolar U.S.A"
                                            const indiceTCVenta = resultadoMoneda[0].indice + 2;
                                            log.debug(proceso, "indice coincidencia moneda: " + i + " - indiceTCVenta: " + indiceTCVenta + " - arrayFinalTD.length: " + arrayFinalTD.length);

                                            if (indiceTCVenta <= arrayFinalTD.length && !utilidades.isEmpty(arrayFinalTD[indiceTCVenta])) {
                                                log.debug(proceso, "datosMonedaHtml: " + JSON.stringify(arrayFinalTD[indiceTCVenta]));
                                                const tipoCambioVenta = arrayFinalTD[indiceTCVenta].textContent.replace(/,/g, ".");
                                                log.debug(proceso, 'tipoCambioVenta: ' + tipoCambioVenta);
                                                log.debug(proceso, "monedasConsultar[i].cotizacion: " + monedasConsultar[i].cotizacion);

                                                if(!utilidades.isEmpty(monedasConsultar[i].cotizacion)){
                                                    tipoCambioVenta = tipoCambioVenta/monedasConsultar[i].cotizacion;
                                                    log.debug(proceso, "tipoCambioVenta Con Cotizacion:  " + tipoCambioVenta);
                                                  }
                                                log.debug(proceso, "tipoCambioVenta: " + tipoCambioVenta);

                                                monedasConsultar[i].tipoCambioVenta = tipoCambioVenta;
                                                response.monedasActualizar.push(monedasConsultar[i]);
                                            } else {
                                                monedasConsultar[i].errorConsultando = true;
                                                monedasConsultar[i].mensajeError = "No se puede acceder al tipo de cambio de venta de la moneda " + monedasConsultar[i].nombreTagHTML + ".";
                                            }
                                        } else {
                                            monedasConsultar[i].errorConsultando = true;
                                            monedasConsultar[i].mensajeError = "No se encontró coincidencia de la solicitada moneda en el HTML, la moneda que no se pudo consultar es: " + monedasConsultar[i].nombreTagHTML + ".";
                                        }
                                    }
                                } else {
                                    response.error = true;
                                    response.mensaje = "Ocurrió un error obteniendo NODO/TAGS de tipos de cambio del XML de respuesta del sitio web del BNA.";
                                }
                            } else {
                                response.error = true;
                                response.mensaje = "Ocurrió un error parseando HTML/XML de respuesta del sitio web del BNA.";
                            }
                        } else {
                            response.error = true;
                            response.mensaje = "Ocurrió un error Obteniendo respuesta del sitio web del BNA.";
                        }
                    } else {
                        response.error = true;
                        response.mensaje = "Ocurrió un error parseando respuesta del sitio web del BNA.";
                    }
                } else {
                    response.error = true;
                    response.mensaje = "No se recibió respuesta del sitio web del BNA.";
                }

                return response;
            } catch (eSend) {
                response.error = true;
                response.code = 500;
                response.body = "Ocurrió una excepción Tratando de procesar información de tipo de cambio del BNA: " + eSend.message + ".";
                response.mensaje = response.body;
                return response;
            }
        }


        /**
         * @return {object}  return             An object with the following properties:
         * @return {array}   return.monedas     An array of objects with all available currencies for the service
         * @return {object}  return.config      An object containing the config (urlservicio)
         * @return {boolean} return.error       True on error
         * @return {string}  return.mensaje     An error message if there is any
        */
        function obtenerConfiguracionBNA() {

            const response = { error: false, mensaje: "" };
            const proceso = "obtenerConfiguracionBNA";

            try {
                // INICIO Consultar URL Servicio
                const objResultSet = utilidades.searchSavedPro("customsearch_l54_config_tc_bna", null);

                if (objResultSet.error) {
                    response.error = true;
                    response.mensaje = "Ocurrió un error al consultar el SS de Configuracion de Tipos de Cambio BNA - Detalles: " + objResultSet.descripcion;
                    return response;
                }

                const resultSet = objResultSet.objRsponseFunction.result;
                const resultSearch = objResultSet.objRsponseFunction.search;

                if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {

                    const config = { urlservicio: "", monedaBase: "", idCarpeta: "", emailEmployee: "", idEmployee: "" };
                    const codigosMonedas = [];

                    for (let i = 0; !utilidades.isEmpty(resultSet) && i < resultSet.length; i++) {
                        config.urlservicio = resultSet[i].getValue({ name: resultSearch.columns[1] });
                        config.monedaBase = resultSet[i].getValue({ name: resultSearch.columns[2] });
                        config.idCarpeta = resultSet[i].getValue({ name: resultSearch.columns[6] });
                        config.idEmployee = resultSet[i].getValue({ name: resultSearch.columns[7] });
                        config.emailEmployee = resultSet[i].getValue({ name: resultSearch.columns[8] });

                        const infoCodigoMoneda = {};
                        infoCodigoMoneda.monedaBase = config.monedaBase;
                        infoCodigoMoneda.idMonedaConsultarBNA = resultSet[i].getValue({ name: resultSearch.columns[3] });
                        infoCodigoMoneda.nombreTagHTML = resultSet[i].getValue({ name: resultSearch.columns[4] });
                        infoCodigoMoneda.consultarEnBNA = resultSet[i].getValue({ name: resultSearch.columns[5] });
                        infoCodigoMoneda.idContenedorHtml = resultSet[i].getValue({ name: resultSearch.columns[9] });
                        infoCodigoMoneda.aplicarInverso = resultSet[i].getValue({ name: resultSearch.columns[10] });
                        infoCodigoMoneda.cotizacion = resultSet[i].getValue({name: resultSearch.columns[11]});
                        codigosMonedas.push(infoCodigoMoneda);
                    }

                    if (utilidades.isEmpty(config.urlservicio)) {
                        response.error = true;
                        response.mensaje = "No se encuentra configurada la URL del Servicio de Consulta de Tipos de Cambio del BNA";
                        return response;
                    }

                    log.debug(proceso, "URL Servicio Tipos de Cambios BNA: " + config.urlservicio + " - Moneda Base : " + config.monedaBase + " - codigosMonedas: " + JSON.stringify(codigosMonedas));
                    response.config = config;
                    response.monedas = codigosMonedas;
                } else {
                    response.error = true;
                    response.mensaje = "No se encontraron registros de configuracion del servicio de consulta de Tipos de Cambios BNA.";
                }
            } catch (err) {
                response.error = true;
                response.mensaje = err.message;
            }
            return response;
        }

        /** 
         * @param {array}   monedasActualizar An array of objects (idInterno, codigo, tipoCambioVenta, currencyNameBna)
         * @param {int}     monedaBase        Netsuite base currency idInterno
         * @return {string} return.taskId     Task Id
         * @return {string} return.error      True on error
         * @return {string} return.mensaje    An error message if there is any
        */
        function actualizarTipoCambio(monedasActualizar, idCarpeta, idEmployee) {

            var response = { error: false, mensaje: "" };

            if (utilidades.isEmpty(monedasActualizar) || monedasActualizar.length <= 0) {
                response.error = true;
                response.message = "No hay monedas para actualizar o el id de la carpeta de las importaciones se encuentra vacía. Revise la configuración del proceso del BNA.";
                return response;
            }

            try {
                log.debug("actualizarTipoCambio", "INICIO llamado de script programado");

                var data = {
                    monedasActualizar: monedasActualizar,
                    idCarpeta: idCarpeta,
                    idEmployee: idEmployee
                };

                var mrTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT
                });
                mrTask.scriptId = "customscript_l54_int_tipo_cambio_bna_sch";
                mrTask.deploymentId = "customdeploy_l54_tipo_cambio_bna_sched";
                mrTask.params = {
                    custscript_l54_params_monedas: JSON.stringify(data),
                };
                var taskId = mrTask.submit(); //Submit ScheduledScript

                response.taskId = taskId;
                log.debug("actualizarTipoCambio", "FIN llamado de script programado");
                return response;
            } catch (e) {
                response.error = true;
                response.mensaje = "Exepcion: " + e.message;
                return response;
            }
        }

        /** 
         * @param {string}   custom    Specify the required format date (HOY [date object]| AYER[string format])
         * @return {string}  return    HOY = A Date object | AYER = A string format)
        */
        function obtenerFechaServidor(custom) {

            try {
                d = new Date();
                utc = d.getTime() + (d.getTimezoneOffset() * 60000);
                offset = -3; //TimeZone Argentina - GMT -3:00
                var fechaActualArg = new Date(utc + (3600000 * offset));

                if (!utilidades.isEmpty(fechaActualArg)) {
                    switch (custom.toUpperCase()) {
                        case "HOY":
                            //Retornamos objecto Date con fecha actual de Argentina
                            return fechaActualArg;
                        case "AYER":
                            var diasRestar = 1; //restando 1 dia a la fecha actual
                            var newDate = new Date(fechaActualArg.setDate(fechaActualArg.getDate() - diasRestar));
                            var formattedstring = formatearFecha(newDate);

                            return formattedstring;
                        default:
                            return null;
                    }
                } else {
                    return null;
                }
            } catch (error) {
                log.error("obtenerFechaServidor", "Error NetSuite Excepcion obtenerFechaServidor - Detalles: " + error.message);
            }
        }

        function formatearFecha(fechaString) {
            if (!utilidades.isEmpty(fechaString)) {
                var f = new Date(format.parse({ value: fechaString, type: format.Type.DATE }));
                var formattedstring = f.getFullYear() + "-" + utilidades.padding_left((parseInt(f.getMonth(), 10) + 1), "0", 2) + "-" + utilidades.padding_left(f.getDate(), "0", 2);
                return formattedstring;
            } else {
                return null;
            }
        }

        function listarMonedas(sublist, listamonedas) {

            try {
                log.debug("listarMonedas", "listaMonedas: " + JSON.stringify(listamonedas));
                if (listamonedas.length > 0) {
                    if (listamonedas.length > 0) {
                        for (var i = 0; i < listamonedas.length; i++) {
                            sublist.setSublistValue({
                                id: "moneda",
                                line: i,
                                value: listamonedas[i].nombreTagHTML
                            });

                            sublist.setSublistValue({
                                id: "tipodecambio",
                                line: i,
                                value: listamonedas[i].tipoCambioVenta
                            });
                        }
                    }
                }
            } catch (error) {
                log.error("listarMonedas", "Error NetSuite Excepcion Listando Monedas - Detalles: " + error.message);
            }
        }

        Number.prototype.toFixedOK = function (decimals) {
            var sign = this >= 0 ? 1 : -1;
            return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
        };

        return {
            onRequest: onRequest
        };

    });