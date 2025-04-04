/**
 *@NApiVersion 2.x
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NScriptType MapReduceScript
 *@NModuleScope Public
 */
define(['N/record', 'N/search', 'N/runtime', 'N/email', 'N/error', 'N/file', 'N/format', 'N/cache', 'L54/utilidades', 'N/url', 'N/render'],

    function (record, search, runtime, email, error, file, format, cache, utilities, url, render) {

        var proceso = "Generación Archivo Pagos Galicia (MR)";

        String.prototype.lpad = function (padString, length) {
            var str = this;
            while (str.length < length)
                str = padString + str;
            return str;
        }

        function getParams() {
            try {
                var informacion = new Object({});
                var currScript = runtime.getCurrentScript();
                var st = JSON.stringify(currScript);

                informacion.pagos = currScript.getParameter('custscript_l54_txt_galicia_mr_pagos');
                informacion.usuario = currScript.getParameter('custscript_l54_txt_galicia_mr_userd');
                informacion.subsidiaria = currScript.getParameter('custscript_l54_txt_galicia_mr_subs');
                informacion.fechaCabecera = currScript.getParameter('custscript_l54_txt_galicia_mr_fecha');
                informacion.datoBancario = currScript.getParameter('custscript_l54_txt_galicia_mr_dbco');
                informacion.moneda = currScript.getParameter('custscript_l54_txt_galicia_mr_mone');
                informacion.banco = currScript.getParameter('custscript_l54_txt_galicia_mr_bank');

                return informacion;
            } catch (excepcion) {
                log.error('getParams', 'INPUT DATA - Excepcion Obteniendo Parametros - Excepcion : ' + excepcion.message.toString());
                return null;
            }
        }

        function getInputData() {

            try {
                log.audit(proceso, 'GetInputData - INICIO');

                var respuesta = new Object();
                respuesta.error = false;
                respuesta.mensaje = "";

                var informacion = getParams();

                log.audit(proceso, 'Parámetros recibidos: ' + JSON.stringify(informacion));

                if (utilities.isEmpty(informacion) || utilities.isEmpty(informacion.pagos) || utilities.isEmpty(informacion.usuario) || utilities.isEmpty(informacion.subsidiaria) || utilities.isEmpty(informacion.fechaCabecera)) {
                    log.error(proceso, 'Error obteniendo alguno de los campos enviados por parámetros, el proceso no puede continuar');
                    return false;
                }

                var arrayPagos = JSON.parse(informacion.pagos);
                log.audit(proceso, 'pase el array de pagos -->'+ JSON.stringify(arrayPagos));
                //Inicio - Consulta Información Pagos
                var filtrosPagos = new Array();
                var infoPagos = new Array();

                var objSearch = search.load({
                    id: 'customsearch_l54_galic_file_pagos_info'
                });
                var defaultFilters = objSearch.filters;
                log.audit(proceso, 'pase el cargado de la busqueda');
                defaultFilters.push(search.createFilter({
                    name: "internalid",
                    operator: search.Operator.ANYOF,
                    values: arrayPagos
                  }));
                objSearch.filters = defaultFilters;
                //rs.filters = defaultFilters;
                log.audit(proceso, 'pase el setear nuevo filtro en la busqueda');
                

                // var columnas = objSearch.columns;
                // var columnasAux = new Array();
                // log.debug(proceso, 'columnas: ' + JSON.stringify(columnas));
                // var contador = 1;
                // for (var i=0 ; i < columnas.length ; i++){
                //     if(columnas[i].name == "formulatext"){
                //         columnas[i].name = 'formulatext' + contador.toString();
                //         contador++;
                //     }
                // }
                // log.debug(proceso, 'columnas: ' + JSON.stringify(columnas));


                // objSearch.columns = columnas;


                log.debug(proceso, 'objSearch: ' + JSON.stringify(objSearch));
                log.audit(proceso, 'GetInputData - FIN');

                return objSearch;

            } catch (error) {
                log.error('GetInputData - Error', 'Error obteniendo la información del suitelet y/o busquedas', error.message);
            }
        }

        function map(context) {
            try {
                log.audit(proceso, 'Map - INICIO');

                var pago = JSON.parse(context.value);

                var pagoDetalle = pago.values;

                log.debug("Pago.values datos", JSON.stringify(pago.values));

                // var currScript = runtime.getCurrentScript();
                // var subsidiaria = JSON.parse(currScript.getParameter('custscript_l54_txt_galicia_mr_subs'));

                //var resultado = context.value;
                                                   
                if (!utilities.isEmpty(pagoDetalle)) {

                    //var searchResult = JSON.parse(resultado);

                    //log.debug(proceso, 'searchResult: ' + JSON.stringify(searchResult));

                    var obj = new Object();
                    obj.pagoID = pagoDetalle.internalid.value;
                    obj.pagoCBU = pagoDetalle.custbody_l54_clave_banc_uniforme;
                    obj.pagoImporte = pagoDetalle.custbody_l54_importe_neto_a_abonar;
                    obj.pagoNombreVendor = pagoDetalle.custbody_l54_nombre_benef_dat_bancario;
                    obj.pagoTipoCambio = pagoDetalle.exchangerate;
                    //obj.pagoRelleno1 = pagoDetalle.pagoRelleno1;
                    //obj.pagoNroVoucher = pagoDetalle.pagoNroVoucher;
                    obj.fechaPago = pagoDetalle.trandate;
                    obj.pagoTipoCuenta = pagoDetalle["custrecord_l54_gen_arc_tipo_cuentas_gali.CUSTBODY_L54_TIPO_CTA_DATOS_BANCARIOS"];
                    obj.pagoImporteRet = pagoDetalle.custbody_l54_importe_total_retencion;
                    obj.pagoGaliciaCuenta = pagoDetalle["custrecord_l54_gen_arc_datos_banc_cuenta.CUSTBODY_L54_DATOS_BANCARIOS_CITIBANK"];
                    obj.pagoCodigoBanco = pagoDetalle["custrecord_l54_gen_arc_datos_banc_bcu.CUSTBODY_L54_DATOS_BANCARIOS_CITIBANK"];
                    obj.pagoNroRegistro = pagoDetalle.custbody_l54_codigo_beneficiario;
                    //obj.pagoEspacioBlanco = pagoDetalle.pagoEspacioBlanco;

                    //log.debug(proceso, 'ID Subsidiaria a enviar al REDUCE: ' + JSON.stringify(subsidiaria));
                    log.debug(proceso, 'Columnas_Objeto : ' + JSON.stringify(obj));

                    var clave = pagoDetalle.internalid.value;
                    context.write(clave, JSON.stringify(obj));
                }

                log.audit(proceso, 'Map - FIN');

            } catch (error) {
                log.error('Map Error', error.message);
            }
        }

        function reduce(context) {

            var respuesta = { "error": false, "idClave": context.key, "infoCSV": [], "detalles_errores": [] };
            var mensaje = "";

            try {

                if (!utilities.isEmpty(context.values) && context.values.length > 0) {
                    log.audit(proceso, 'INICIO REDUCE - KEY : ' + context.key);
                    log.debug(proceso, 'LENGTH: ' + context.values.length);
                    //log.debug('REDUCE', 'context.values: ' + JSON.stringify(context.values));

                    respuesta.idClave = context.key;

                    if (!utilities.isEmpty(context.values) && context.values.length > 0) {

                        for (var i = 0; i < context.values.length; i++) {
                            var registro = JSON.parse(context.values[i]);
                            //log.debug('REDUCE', 'registro: ' + JSON.stringify(registro));
                            respuesta.infoCSV.push(registro);
                        }
                    }

                    log.audit(proceso, 'FIN REDUCE - KEY : ' + context.key);
                }
            } catch (error) {
                respuesta.error = true;
                mensaje = 'Excepcion Inesperada - Mensaje: ' + error.message + ', key: ' + context.key;
                respuesta.detalles_errores.push(mensaje);
                log.error('Reduce error', mensaje);
            }

            context.write(context.key, respuesta);
        }

        function summarize(summary) {
            try {

                var totalReduceErrors = 0;
                var arrayReduceResults = [];
                var arrayReduceErrors = [];
                var errorReduce = false;
                var infoCSV = '';

                log.debug(proceso, 'Inicio - Summarize');

                summary.output.iterator().each(function (key, value) {

                    var objResp = JSON.parse(value);

                    log.debug(proceso, 'objResp: ' + JSON.stringify(objResp));

                    if (objResp.error == true) {
                        errorReduce = true;
                        totalReduceErrors++;
                        arrayReduceErrors.push({ "ID Clave": objResp.idClave, "Detalle": objResp.detalles_errores });
                    }
                    arrayReduceResults.push(objResp);
                    return true;
                });

                log.audit({
                    title: proceso,
                    details: 'Total errores en procesamiento: ' + totalReduceErrors + ', error: ' + errorReduce + ', arrayReduceResults: ' + JSON.stringify(arrayReduceResults)
                });

                var informacion = getParams();
                var idUsuario = informacion.usuario;
                var respuesta = {};
                respuesta.error = false;
                respuesta.message = null;
                
                //
                var arrayPagosSum = JSON.parse(informacion.pagos);

                //Inicio - Consulta Información SUM importes Pagos
                var filtrosSUMPagos = new Array();

                var filtroSubsidiaria = new Object();
                filtroSubsidiaria.name = 'subsidiary';
                filtroSubsidiaria.operator = 'IS';
                filtroSubsidiaria.values = informacion.subsidiaria;
                filtrosSUMPagos.push(filtroSubsidiaria);

                var filtroIDPagos = new Object();
                filtroIDPagos.name = 'internalid';
                filtroIDPagos.operator = 'ANYOF';
                filtroIDPagos.values = arrayPagosSum;
                filtrosSUMPagos.push(filtroIDPagos);

                //sum pagos
                var searchSUMPagos = utilities.searchSavedPro('customsearch_tek_txtbk_genarc_gal_pag_sm', filtrosSUMPagos);

                if (!searchSUMPagos.error && !utilities.isEmpty(searchSUMPagos.objRsponseFunction.result) && searchSUMPagos.objRsponseFunction.result.length > 0) {

                    var pagosSUMResultSet = searchSUMPagos.objRsponseFunction.result;
                    var pagosSUMResultSearch = searchSUMPagos.objRsponseFunction.search;

                    if (pagosSUMResultSet.length > 0) {
                        var pagosSUMImporte = pagosSUMResultSet[0].getValue({ name: pagosSUMResultSearch.columns[0] });
                        log.debug(proceso, 'pagosSUMImporte: ' + pagosSUMImporte);

                    }
                }
                //
                var informacionCSV = new Array();
                log.debug(proceso, 'arrayReduceResults.length: ' + JSON.stringify(arrayReduceResults.length));
                for (var j = 0; j < arrayReduceResults.length; j++) {
                    log.debug(proceso,"Flag entre: "+ j + "-- Informacion: "+JSON.stringify(arrayReduceResults[j].infoCSV));

                    informacionCSV.push(arrayReduceResults[j].infoCSV[0]);
                    var errores = JSON.stringify(arrayReduceResults[j].detalles_errores).replace(/,/g, '\n').replace(/\[|\]|\"/g, "");
                }

                log.debug(proceso, 'informacionCSV.length: ' + JSON.stringify(informacionCSV.length));
                log.debug(proceso, 'informacion.fechaCabecera: ' + informacion.fechaCabecera);

                var fechaCabecera = informacion.fechaCabecera;
                var fechaCabeceraParse = format.parse({ value: fechaCabecera, type: format.Type.DATE });
                var fechaCabeceraLocal = getDate(fechaCabeceraParse, -2);
                var fechaHeader1 = formatoFechaHora(fechaCabeceraLocal, 'H1');
                var fechaHeader2Formato = formatoFechaHora(fechaCabeceraLocal, 'H2');
                var monedaDebito = evaluarMoneda(informacion.moneda);
                var anioFin = fechaHeader2Formato.anio.toString().substr(2, 2);
                var fechaHeader2 = fechaHeader2Formato.diaMes + '/' + anioFin;
                log.debug(proceso, 'fechaHeader1: ' + fechaHeader1 + ', fechaHeader2: ' + fechaHeader2);

                var fechaServidor = new Date();
                var fechaLocal = format.format({ value: fechaCabeceraParse, type: format.Type.DATETIME, timezone: format.Timezone.AMERICA_BUENOS_AIRES });
                var fechaLocalParse = format.parse({ value: fechaLocal, type: format.Type.DATETIME, timezone: format.Timezone.AMERICA_BUENOS_AIRES });
                var fechaArchivo = fechaLocal;
                log.debug(proceso, 'fechaArchivo: ' + fechaArchivo);

                //Inicio - Consulta "AR - Banco Galicia File - Panel Config."
                //var infoHeader = new Array();
                var filtrosPanelConfig = new Array();
                var objHeader = new Object();

                var filtroSubsidiaria = new Object();
                filtroSubsidiaria.name = 'custrecord_l54_pago_panel_sub';
                filtroSubsidiaria.operator = 'IS';
                filtroSubsidiaria.values = informacion.subsidiaria;
                filtrosPanelConfig.push(filtroSubsidiaria);

                var filtroBanco = new Object();
                filtroBanco.name = 'custrecord_l54_pago_panel_banco_file';
                filtroBanco.operator = 'IS';
                filtroBanco.values = informacion.banco;
                filtrosPanelConfig.push(filtroBanco);

                var searchPanelConfig = utilities.searchSavedPro('customsearch_l54_pagos_file_panel_conf', filtrosPanelConfig);

                if (!searchPanelConfig.error && !utilities.isEmpty(searchPanelConfig.objRsponseFunction.result) && searchPanelConfig.objRsponseFunction.result.length > 0) {

                    var panelConfigResultSet = searchPanelConfig.objRsponseFunction.result;
                    var panelConfigResultSearch = searchPanelConfig.objRsponseFunction.search;

                    log.debug(proceso, 'panelConfigResultSet.length: ' + JSON.stringify(panelConfigResultSet.length));

                    if (panelConfigResultSet.length == 1) {
                        //var objHeader = new Object();
                        objHeader.configIdInterno = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[0] });
                        objHeader.configTipoRegHeader = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[2] });
                        objHeader.configCategoriaLegal = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[3] });
                        objHeader.configIdDebito = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[4] });
                        objHeader.configIdCredito = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[5] });
                        objHeader.configTipoRegDetalle = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[6] });
                        objHeader.configNombreArchivo = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[7] });
                        objHeader.configCarpetaArchivo = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[8] });
                        objHeader.configNroSecuencia = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[9] });
                        objHeader.configCUIT = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[11] });
                        objHeader.idTemplate = panelConfigResultSet[0].getValue({ name: panelConfigResultSearch.columns[12] });
                        objHeader.moneda = monedaDebito;
                        objHeader.pagoSum = formatString(parseInt(pagosSUMImporte*100), 14, '0');
                        objHeader.fechaMin = informacionCSV[0].fechaPago;
                    }
                }

                log.debug(proceso, 'objHeader: ' + JSON.stringify(objHeader));
                //Fin - Consulta "AR - Banco Galicia File - Panel Config."
                var nroSecuenciaActual = objHeader.configNroSecuencia;
                var registroPanel = objHeader.configIdInterno;
                //Inicio - Consulta "AR - Banco Galicia File - Datos Bancarios"
                var objDatoBancario = new Object();
                var filtrosDatoBancario = new Array();

                var filtroID = new Object();
                filtroID.name = 'internalid';
                filtroID.operator = 'IS';
                filtroID.values = informacion.datoBancario;
                filtrosDatoBancario.push(filtroID);


                var searchDatoBancario = utilities.searchSavedPro('customsearch_l54_pago_file_datos_banc', filtrosDatoBancario);

                if (!searchDatoBancario.error && !utilities.isEmpty(searchDatoBancario.objRsponseFunction.result) && searchDatoBancario.objRsponseFunction.result.length > 0) {

                    var datoBancarioResultSet = searchDatoBancario.objRsponseFunction.result;
                    var datoBancarioResultSearch = searchDatoBancario.objRsponseFunction.search;

                    log.debug(proceso, 'datoBancarioResultSet.length: ' + JSON.stringify(datoBancarioResultSet.length));
                    //log.debug(proceso, 'datoBancarioResultSet: ' + JSON.stringify(datoBancarioResultSet));

                    if (datoBancarioResultSet.length == 1) {
                        
                        objDatoBancario.datoIdInterno = datoBancarioResultSet[0].getValue({ name: datoBancarioResultSearch.columns[0] });
                        objDatoBancario.datoNombre = datoBancarioResultSet[0].getValue({ name: datoBancarioResultSearch.columns[1] });
                        objDatoBancario.codigoEmpresa = datoBancarioResultSet[0].getValue({ name: datoBancarioResultSearch.columns[2] });
                        objDatoBancario.datoCBU = datoBancarioResultSet[0].getValue({ name: datoBancarioResultSearch.columns[3] });
                        objDatoBancario.datoNroCtaBanco = datoBancarioResultSet[0].getValue({ name: datoBancarioResultSearch.columns[4] });
                    }
                }
                //Fin - Consulta "AR - Banco Galicia File - Datos Bancarios"

                log.debug(proceso, 'objDatoBancario: ' + JSON.stringify(objDatoBancario));
                //log.debug(proceso, 'infoDatoBancario: ' + JSON.stringify(infoDatoBancario) + ', infoDatoBancario.length: ' + JSON.stringify(infoDatoBancario.length));

                var espacio = ' ';

                //INICIO - Armado del CSV
                // if (infoHeader.length == 1) {
                //     for (var k = 0; k < infoHeader.length; k++) {
                //         //HEADER
                //         infoCSV += infoHeader[k].configTipoRegHeader;
                //         infoCSV += infoHeader[k].configCodEmpresa;
                //         infoCSV += infoHeader[k].configCUIT;
                //         infoCSV += ' ';
                //         infoCSV += monedaDebito;
                //         infoCSV += cuentaBanco;
                //         infoCSV += cuentaCBU;
                //         infoCSV += formatString(parseInt(pagosSUMImporte*100), 14, '0');
                //         infoCSV += informacionCSV[0].fechaPago;
                //         infoCSV += '               ';
                //         infoCSV += ' ';
                //         infoCSV += espacio.toString().lpad(' ', 379);
                //         infoCSV += '\r\n';//Salto de linea

                //         var nombreArchivoCSV = infoHeader[k].configNombreArchivo;
                //         var carpetaArchivoCSV = infoHeader[k].configCarpetaArchivo;
                //         var codigoEmpresa = infoHeader[k].configCodEmpresa;
                //         var tipoRegDetalle = infoHeader[k].configTipoRegDetalle;
                //         var categLegal = infoHeader[k].configCategoriaLegal;
                //     }
                // }
                var nombreArchivoCSV = objHeader.configNombreArchivo;
                var carpetaArchivoCSV = objHeader.configCarpetaArchivo;

                log.debug(proceso, 'nombreArchivoCSV: ' + nombreArchivoCSV + ', carpetaArchivoCSV: ' + carpetaArchivoCSV);
                var procesoSummarize = ': Generación archivo pagos de proveedores - Banco Galicia (' + nombreArchivoCSV + ')';

                //Se recorre la información de cada Pago
                // for (var i = 0; i < informacionCSV.length; i++) {
                //     //var importeFinal = 0.00;
                //     infoCSV += informacionCSV[i].pagoNombreVendor;
                //     infoCSV += informacionCSV[i].pagoNroRegistro;
                //     infoCSV += informacionCSV[i].fechaPago;
                //     infoCSV += informacionCSV[i].pagoTipoCuenta;
                //     infoCSV += monedaDebito;
                //     infoCSV += informacionCSV[i].pagoGaliciaCuenta;
                //     infoCSV += informacionCSV[i].pagoCBU;
                //     infoCSV += '32';//cod Transaccion
                //     infoCSV += '2';//TipoPago 2= Pago Proveedores
                //     infoCSV += informacionCSV[i].pagoImporte;
                //     infoCSV += informacionCSV[i].pagoRelleno1;
                    
                //     // infoCSV += categLegal;
                //     // infoCSV += informacionCSV[i].pagoNroFactura;
                //     // infoCSV += informacionCSV[i].pagoRelleno1;
                //     // infoCSV += informacionCSV[i].pagoNroVoucher;
                //     // 
                //     // infoCSV += 
                //     // infoCSV += informacionCSV[i].pagoImporteRet;
                //     // 
                //     // infoCSV += informacionCSV[i].pagoImporteNC;
                    
                //     // infoCSV += informacionCSV[i].pagoEspacioBlanco;
                //     infoCSV += '\r\n';//Salto de linea
                //     arrayPagos.push(informacionCSV[i].pagoID);
                // }

                //Parte Footer
                // var espacio1 = ' ';
                // infoCSV += tipoRegDetalle;
                // infoCSV += codigoEmpresa;
                // infoCSV += informacionCSV.length.toString().lpad('0', 7);
                // infoCSV += espacio1.toString().lpad(' ', 462);
                // infoCSV += '\r\n';
                //96969
                
                if (!utilities.isEmpty(carpetaArchivoCSV) && !utilities.isEmpty(nombreArchivoCSV) && !utilities.isEmpty(fechaArchivo)) {
                    var pagos = new Object();
                    pagos.pago = informacionCSV;

                    var rendererTXT = render.create();

                    var fileTXT = file.load({
                        id: objHeader.idTemplate
                    });
                    log.debug("flag","Pase el cargado de archivo");
                    var templateTXT = fileTXT.getContents();
                    rendererTXT.templateContent = templateTXT;
                    rendererTXT.addCustomDataSource({
                        format: render.DataSource.OBJECT,
                        alias: "header",
                        data: objHeader
                    });
                    rendererTXT.addCustomDataSource({
                        format: render.DataSource.OBJECT,
                        alias: "datobancario",
                        data: objDatoBancario
                    });
                    rendererTXT.addCustomDataSource({
                        format: render.DataSource.OBJECT,
                        alias: "pagos",
                        data: pagos
                    });

                    var stringTXT = rendererTXT.renderAsString();

                    log.debug("flag","Pase el renderizado");
                    nombreArchivoCSV = nombreArchivoCSV + '_' + fechaArchivo + '.txt';

                    var archivo = file.create({
                        name: nombreArchivoCSV,
                        fileType: file.Type.PLAINTEXT,
                        contents: stringTXT,
                        folder: carpetaArchivoCSV
                    });

                    var fileId = archivo.save();
                }

                log.audit(proceso, 'informacionCSV: ' + JSON.stringify(informacionCSV));
                log.audit(proceso, 'informacionCSV.length: ' + JSON.stringify(informacionCSV.length));

                for (var j = 0; j < informacionCSV.length; j++) {
                    //Se actualiza el check de "AR - Incluido En Archivo Pagos Prov. Banco Galicia" en el Pago
                    try {
                        var updPago = record.submitFields({
                            type: 'vendorpayment',
                            id: informacionCSV[j].pagoID,
                            values: {
                                custbody_l54_txt_file_procesado: true,
                                custbody_l54_txt_file_fecha: fechaLocalParse
                            },
                            options: {
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                            }
                        });
                        if (utilities.isEmpty(updPago)) {
                            log.error(proceso, 'Error Sumarize - Error : No se actualizó el Pago con ID Interno; ' + informacionCSV[j].pagoID + '.');
                        }
                    } catch (excepcionSave) {
                        log.error(proceso, 'Excepcion Inesperada al actualizar el Pago con ID Interno: ' + informacionCSV[j].pagoID + ' - Excepcion : ' + excepcionSave.message);
                    }
                }

                var author = idUsuario;
                var recipients = idUsuario;
                var subject = 'Proceso ' + procesoSummarize;

                if (summary.inputSummary.error) {
                    var e = error.create({
                        name: 'INPUT_STAGE_FAILED',
                        message: summary.inputSummary.error
                    });

                    body = 'Ocurrio un error con la siguiente informacion : <br>' +
                        'Codigo de Error: ' + e.name + '<br>' +
                        'Mensaje de Error: ' + e.message;

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
                        var msg = 'MAP Error: ' + key + '. Error was: ' + JSON.parse(value).message + '<br>';
                        errorMsg.push(msg);
                        return true;
                    });

                    summary.reduceSummary.errors.iterator().each(function (key, value) {
                        var msg = 'REDUCE Error: ' + key + '. Error was: ' + JSON.parse(value).message + '<br>';
                        errorMsg.push(msg);
                        return true;
                    });

                    if (errorMsg.length > 0) {
                        var e = error.create({
                            name: 'ERROR_CUSTOM',
                            message: JSON.stringify(errorMsg)
                        });

                        body = 'Ocurrio un error con la siguiente informacion : <br>' +
                            'Codigo de Error: ' + e.name + '<br>' +
                            'Mensaje de Error: ' + e.message;

                        email.send({
                            author: author,
                            recipients: recipients,
                            subject: subject,
                            body: body
                        });

                        respuesta.error = true;
                        respuesta.message = body;
                    } else {
                        if (errorReduce) {
                            var errorString = JSON.stringify(arrayReduceErrors);
                            errorString = errorString.replace(/,/g, '\n').replace(/\[|\]|\"/g, "");

                            body = 'Ocurrieron errores en el procesamiento, puede verificarlo en el siguiente enlace: <br> <a href="' + urlRT + '"> L54 - Gen. Arch. HSBC - Log  </a>' +
                                '<br> <br> Resumen de errores en la ' + procesoSummarize + ' : <br>' + errorString;

                            email.send({
                                author: author,
                                recipients: recipients,
                                subject: subject,
                                body: body
                            });

                            respuesta.error = true;
                            respuesta.message = body;
                        } else {

                            body = 'El proceso' + procesoSummarize + ' ha finalizado correctamente. Se adjunta el archivo generado.'

                            var adjunto = null;

                            if (!utilities.isEmpty(fileId)) {
                                var fileObj = file.load({
                                    id: fileId
                                });
                                adjunto = [fileObj];

                            }

                            email.send({
                                author: author,
                                recipients: recipients,
                                subject: subject,
                                body: body,
                                attachments: adjunto
                            });

                            respuesta.message = body;
                        }
                    }
                }
                
                // Inicio - Actualizar "Próximo Nro Secuencia"
                if (!utilities.isEmpty(nroSecuenciaActual) && !utilities.isEmpty(registroPanel)) {
                    var proxNumSecuencia = parseInt(1) + parseInt(nroSecuenciaActual);

                    try {
                        var idNumEnvioAct = record.submitFields({
                            type: 'customrecord_l54_pago_file_panel_conf',
                            id: registroPanel,
                            values: {
                                custrecord_l54_pago_panel_prox_nro_sec: proxNumSecuencia.toString()
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true
                            }
                        });

                        if (utilities.isEmpty(idNumEnvioAct)) {
                            error = true;
                            mensajeError = 'Error Actualizando Proximo Numero de Secuencia - No se recibio el Proximo Numero Secuencia';
                            log.error('REDUCE', 'Error Actualizando Proximo Numero de Envio - : ' + mensajeError);
                        }
                    } catch (excepcion) {
                        error = true;
                        mensajeError = 'Excepcion Actualizando Proximo Numero de Secuencia - Excepcion : ' + excepcion.message.toString();
                        log.error('REDUCE', 'Excepcion Actualizando Proximo Numero de Secuencia - Excepcion : ' + excepcion.message.toString());
                    }

                }
                // Fin - Actualizar "Próximo Nro Secuencia"

                log.debug(proceso, 'Fin - Summarize');

            } catch (error) {
                log.error('Summarize catch error', error.message);
            }
        }

        function evaluarMoneda(idMoneda){
            var codigo = '';
            var mySearch = search.create({
                type: 'currency',
                filters: [
                    ["internalid","anyof",idMoneda],
                ],
                columns: [
                    search.createColumn({name: "name"}),
                    search.createColumn({name: "symbol"})
                ],
            });
            var results = mySearch.run().getRange({
                start: 0,
                end: 1
            });
            log.debug("Resultado Busqueda",JSON.stringify(results));
            log.debug("Columnas: ", results[0].getValue({name: mySearch.columns[0]}));
            if(!utilities.isEmpty(results)){
                if(results[0].getValue({name: mySearch.columns[0]}) == 'ARS'){
                    codigo = '1';
                }else if(results[0].getValue({name: mySearch.columns[0]}) == 'USD'){
                    codigo = '2';
                }else{
                    codigo = '0'
                }
            }
            return codigo;
        }

        function formatString(_data, _length, _char, _direction) {
            //_data = string a ser formatada; _length = tamanho da string; 
            //_char = caracter para preenchimento; _direction = "before" para inserir caracteres antes da string ou "after" para inserir depois

            var _dataFormated = '';

            if (!_char) {
                _char = ' ';
            }

            if (typeof(_data) == 'number') {

                _data = _data.toString() ;

            } 

            if (!_direction) {
                _direction = 'before';
            }

            if (_data.length >= _length) {
                _dataFormated = _data.substring(0, _length);
            } else {
                _dataFormated =  _direction == 'before'? repeatString(_char, (_length - _data.length)) + _data:
                                    _data + repeatString(_char, (_length - _data.length));
            }

            return _dataFormated;
        }  

        function repeatString(_str, _num) {

            if (_num < 0) {
                return ""; // Return an empty string if num is negative
            } else if (_num === 0) {
                return _str; // Return the original string if num is 0
            } else {
                var repeatedString = "";
                for (var r = 0; r < _num; r++) {
                    repeatedString += _str; // Concatenate the string to the repeatedString variable
                }

                return repeatedString;
            }
        } 

        function formatoFechaHora(fechaLocal, tipoFecha) {

            try {
                var d = fechaLocal,
                    month = '' + (d.getMonth() + 1),
                    day = '' + d.getDate(),
                    year = d.getFullYear(),
                    hour = d.getHours(),
                    minutes = d.getMinutes(),
                    seconds = d.getSeconds(),
                    dd = 'AM',
                    h = hour;

                if (h >= 12) {
                    h = hour - 12;
                    dd = "PM";
                }

                if (h == 0) {
                    h = 12;
                }

                //d/M/yy h:mm a
                if (month.length < 2) month = '0' + month;
                if (day.length < 2) day = '0' + day;
                if (h.toString().length < 2) h = '0' + h;
                if (minutes.toString().length < 2) minutes = '0' + minutes;
                if (seconds.toString().length < 2) seconds = '0' + seconds;

                if (tipoFecha == 'H1') {
                    return year + month + day;
                } else {
                    var objFecha = new Object();
                    objFecha.diaMes = month + '/' + day;
                    objFecha.anio = year;
                    return objFecha;
                }

            } catch (e) {
                log.error('formatDate', e.message);
            }
        }

        //Toma una fecha ubicada en otra zona horaria y la mueve a GMT0. Con zonaHoraria se puede cambiar por otra diferente a GMT0
        function getDate(fecha, zonaHoraria) {

            try {

                var utc = new Date(fecha); //GMT 0
                zonaHoraria = utilities.isEmpty(zonaHoraria) ? 0 : zonaHoraria;
                utc = utc.getTime() + (utc.getTimezoneOffset() * 60000);
                return new Date(utc + (3600000 * zonaHoraria));

            } catch (e) {
                log.error('getDate', e.message);
            }
        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
