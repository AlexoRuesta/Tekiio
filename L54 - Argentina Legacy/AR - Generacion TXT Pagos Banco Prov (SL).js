/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */
define(['N/record', 'N/search', 'N/runtime', 'N/email', 'N/error', 'N/file', 'N/format', 'N/cache', 'L54/utilidades', 'N/url', 'N/ui/serverWidget', 'N/task'],

    function (record, search, runtime, email, error, file, format, cache, utilities, url, serverWidget, task) {

        var proceso = "Generación Archivo Pagos (SL)";

        function onRequest(context) {
            try {

                var form = serverWidget.createForm({
                    title: 'Generación Archivo TXT Bancos - Pagos Proveedores'
                });

                form.clientScriptModulePath = './AR - Generacion TXT Pagos Banco Prov (CL).js'

                log.debug(proceso, 'INICIO Dibujando SuiteLet');

                var grupoFiltros = form.addFieldGroup({
                    id: 'filtros',
                    label: 'Criterios de Búsqueda de Pagos'
                });

                var grupoInfoGeneral = form.addFieldGroup({
                    id: 'infogeneral',
                    label: 'Generación de Archivo'
                });

                var grupoDatos = form.addFieldGroup({
                    id: 'datos',
                    label: 'Generación de Archivo'
                });

                var grupoInfo = form.addFieldGroup({
                    id: 'info',
                    label: ' '
                });

                var tabDetalle = form.addTab({
                    id: 'tabdetalle',
                    label: 'Detalle'
                });

                var subtabPagos = form.addSubtab({
                    id: 'tabpagos',
                    label: 'Pagos',
                    tab: 'tabdetalle'
                });

                // INICIO CAMPOS
                var btnAccion = form.addField({
                    id: 'custpage_accion',
                    label: 'Accion:',
                    type: serverWidget.FieldType.TEXT,
                    container: 'filtros'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });

                var galicia = form.addField({
                    id: 'custpage_galicia',
                    label: 'Cuenta Galicia:',
                    type: serverWidget.FieldType.TEXT,
                    container: 'filtros'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });

                var pGalicia = runtime.getCurrentScript().getParameter({ name: 'custscript_l54_txt_banco_arch_galicia' });
                galicia.defaultValue = pGalicia;
                // FIN CAMPOS

                // INICIO FILTROS
                //Subsidiaria
                if (utilities.l54esOneworld) {
                    var subsidiaria = form.addField({
                        id: 'custpage_subsidiaria',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Subsidiaria',
                        source: 'subsidiary',
                        container: 'filtros'
                    });

                    subsidiaria.isMandatory = true;

                    if (!utilities.isEmpty(context.request.parameters.custpage_subsidiaria)) {
                        subsidiaria.defaultValue = context.request.parameters.custpage_subsidiaria;
                    }
                }
                else {
                    var subsidiaria = 0;
                }

                //Fecha Desde
                var fechaDesde = form.addField({
                    id: 'custpage_fechadesde',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha Desde',
                    container: 'filtros'
                });

                fechaDesde.isMandatory = true;

                if (!utilities.isEmpty(context.request.parameters.custpage_fechadesde)) {
                    fechaDesde.defaultValue = context.request.parameters.custpage_fechadesde;
                }

                //Fecha Hasta
                var fechaHasta = form.addField({
                    id: 'custpage_fechahasta',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha Hasta',
                    container: 'filtros'
                });

                fechaHasta.isMandatory = true;

                if (!utilities.isEmpty(context.request.parameters.custpage_fechahasta)) {
                    fechaHasta.defaultValue = context.request.parameters.custpage_fechahasta;
                }

                //Mostrar todos
                var mostrarIncluidos = form.addField({
                    id: 'custpage_mostrar_incluidos',
                    label: 'Mostrar Pagos ya incluidos en archivo',
                    type: serverWidget.FieldType.CHECKBOX,
                    container: 'filtros'
                });

                if (!utilities.isEmpty(context.request.parameters.custpage_mostrar_incluidos)) {
                    mostrarIncluidos.defaultValue = context.request.parameters.custpage_mostrar_incluidos;
                }

                //Dato Bancario
                var datoBanco = form.addField({
                    id: 'custpage_datobanco',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Dato Bancario',
                    source: 'customrecord_l54_txtbank_file_datos_banc',
                    container: 'filtros'
                });

                if (!utilities.isEmpty(context.request.parameters.custpage_datobanco)) {
                    datoBanco.defaultValue = context.request.parameters.custpage_datobanco;
                }

                datoBanco.isMandatory = true;


                var moneda = form.addField({
                    id: 'custpage_moneda',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Moneda',
                    source: 'currency',
                    container: 'filtros'
                });

                moneda.isMandatory = true;

                if (!utilities.isEmpty(context.request.parameters.custpage_moneda)) {
                    moneda.defaultValue = context.request.parameters.custpage_moneda;
                }
                // FIN FILTROS

                // INICIO INFORMACIÓN GENERAL
                //Fecha Solicitud/Archivo
                var fechaSolicitud = form.addField({
                    id: 'custpage_fechaarchivo',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha Solicitud/Archivo',
                    container: 'infogeneral'
                });

                fechaSolicitud.isMandatory = true;

                var fechaServidor = new Date();

                var fechaParse = format.parse({ value: fechaServidor, type: format.Type.DATE });

                if (!utilities.isEmpty(context.request.parameters.custpage_fechaarchivo)) {
                    fechaSolicitud.defaultValue = context.request.parameters.custpage_fechaarchivo;
                } else {
                    if (!utilities.isEmpty(fechaParse)) {
                        fechaSolicitud.defaultValue = fechaParse;
                    }
                }

                //Nro de Secuencia
                var nroSecuencia = form.addField({
                    id: 'custpage_nrosecuencia',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Número de Secuencia',
                    container: 'infogeneral'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                if (!utilities.isEmpty(context.request.parameters.custpage_nrosecuencia)) {
                    nroSecuencia.defaultValue = context.request.parameters.custpage_nrosecuencia;
                }

                //Banco Cliente 
                var bancoCliente = form.addField({
                    id: 'custpage_bancocliente',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Dato Bancario - Banco Cliente',
                    source: 'customrecord_l54_gen_arc_pg_bc',
                    container: 'infogeneral'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                if (!utilities.isEmpty(context.request.parameters.custpage_bancocliente)) {
                    bancoCliente.defaultValue = context.request.parameters.custpage_bancocliente;
                }

                bancoCliente.isMandatory = true;


                //Nro CBU Cliente
                var nroCBUCliente = form.addField({
                    id: 'custpage_nrocbucliente',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Dato Bancario - CBU',
                    container: 'infogeneral'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                if (!utilities.isEmpty(context.request.parameters.custpage_nrocbucliente)) {
                    nroCBUCliente.defaultValue = context.request.parameters.custpage_nrocbucliente;
                }

                nroCBUCliente.isMandatory = true;

                //Nro Cuenta Cliente
                var nroCtaCliente = form.addField({
                    id: 'custpage_nrocuentacliente',
                    type: serverWidget.FieldType.TEXT,
                    label: 'Dato Bancario - Nro Cuenta',
                    container: 'infogeneral'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                if (!utilities.isEmpty(context.request.parameters.custpage_nrocuentacliente)) {
                    nroCtaCliente.defaultValue = context.request.parameters.custpage_nrocuentacliente;
                }

                nroCtaCliente.isMandatory = true;
                // FIN INFORMACIÓN GENERAL

                // INICIO SUBLISTA
                var sublistPagos = form.addSublist({
                    id: 'listadopagos',
                    type: serverWidget.SublistType.LIST,
                    label: 'Listado de Pagos',
                    tab: 'tabpagos'
                });

                sublistPagos.addField({
                    id: 'procesar',
                    label: 'Procesar',
                    type: serverWidget.FieldType.CHECKBOX
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.ENTRY
                });

                sublistPagos.addField({
                    id: 'idpago',
                    label: 'ID Interno',
                    type: serverWidget.FieldType.TEXTAREA
                });

                sublistPagos.addField({
                    id: 'nrodocumento',
                    label: 'Nro Documento',
                    type: serverWidget.FieldType.TEXTAREA
                }).updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });

                sublistPagos.addField({
                    id: 'nrotransaccion',
                    label: 'Nro Transaccion',
                    type: serverWidget.FieldType.TEXTAREA
                });
   
                /*sublistPagos.addField({
                    id: 'fechaemision',
                    label: 'Fecha de Emisión',
                    type: serverWidget.FieldType.TEXTAREA
                });*/

                sublistPagos.addField({
                    id: 'fechapago',
                    label: 'Fecha de Pago',
                    type: serverWidget.FieldType.TEXTAREA
                });

                sublistPagos.addField({
                    id: 'idproveedor',
                    label: 'Proveedor',
                    type: serverWidget.FieldType.SELECT,
                    source: 'vendor'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                });

                sublistPagos.addField({
                    id: 'importe',
                    label: 'Importe Pago',
                    type: serverWidget.FieldType.TEXTAREA
                });

                var aux = sublistPagos.addField({
                    id: 'impretencion',
                    label: 'Importe Retención',
                    type: serverWidget.FieldType.TEXTAREA
                });

                sublistPagos.addField({
                    id: 'moneda',
                    label: 'Moneda',
                    type: serverWidget.FieldType.SELECT,
                    source: 'currency'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.INLINE
                });

                sublistPagos.addField({
                    id: 'tipocambio',
                    label: 'Tipo de Cambio',
                    type: serverWidget.FieldType.TEXTAREA
                });

                /*sublistPagos.addField({
                    id: 'importehsbc',
                    label: 'Importe Pago HSBC (ARS)',
                    type: serverWidget.FieldType.TEXTAREA
                });*/

                sublistPagos.addField({
                    id: 'incluido',
                    label: '¿Incluido en archivo?',
                    type: serverWidget.FieldType.CHECKBOX
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });


                sublistPagos.addMarkAllButtons();

                // FIN SUBLISTA

                form.addSubmitButton({
                    label: 'Generar Archivo'
                });

                form.addButton({
                    id: 'custpage_btbuscarpagos',
                    label: 'Buscar Pagos',
                    functionName: "buscarPagos"
                });

                var infoResultado = form.addField({
                    id: 'custpage_resultado',
                    label: 'Resultados',
                    type: serverWidget.FieldType.INLINEHTML
                });

                if (context.request.method === 'GET') {
                    log.audit(proceso, 'FIN Proceso');
                    context.response.writePage(form);
                } else {
                    var sAccion = utilities.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;
                    log.debug(proceso, 'POST accion: ' + sAccion);
                    switch (sAccion) {
                        case 'GENERAR':
                            var mensaje = "  Se proceso su solicitud. Recibira una notificacion al finalizar por email";
                            var resultado = generarArchivo(sublistPagos, context.request);
                            if (!utilities.isEmpty(resultado) && resultado.error == true) {
                                mensaje = resultado.mensaje;
                                log.error(proceso, 'Error al intentar invocar la Generación Archivo de Pagos - Error : ' + mensaje);
                            }
                            infoResultado.defaultValue = '<font color="red">&nbsp;&nbsp;&nbsp;' + mensaje + '</font>';
                            log.audit(proceso, 'FIN Proceso');

                            context.response.writePage(form);
                            break;

                        case 'BUSCAR':
                            var mostrarIncluidos = context.request.parameters.custpage_mostrar_incluidos == 'T' ? true : false;
                            var idSubsidiaria = context.request.parameters.custpage_subsidiaria;
                            var fechaDesdeConsulta = context.request.parameters.custpage_fechadesde;
                            var fechaHastaConsulta = context.request.parameters.custpage_fechahasta;
                            var cuentaBancaria = context.request.parameters.custpage_datobanco;
                            var idMoneda = context.request.parameters.custpage_moneda;
                            var idBanco = context.request.parameters.custpage_bancocliente;
                            var infoPanel = consultarPanel(idSubsidiaria,idBanco);
                            log.debug(proceso, 'infoPanel: ' + JSON.stringify(infoPanel));
                            var pagos = busquedaPagos(mostrarIncluidos, idSubsidiaria, fechaDesdeConsulta, fechaHastaConsulta, cuentaBancaria, idMoneda, infoPanel);

                            var instCalculoRet = infoPanel[0].panelInstCalcRet;
                            var nroSecuenciaActual  = infoPanel[0].panelNroSecuencia;

                            nroSecuencia.defaultValue = nroSecuenciaActual;
                            nroSecuencia.isMandatory = true;

                            log.debug(proceso, 'pagos.error: ' + pagos.error + ', pagos.result.length: ' + pagos.result.length);

                            if (!pagos.error) {
                                //se genera la sublista
                                if (pagos.result.length > 0) {
                                    var listaPagos = listarPagos(sublistPagos, pagos.result, mostrarIncluidos, instCalculoRet, aux);
                                }
                            }

                            log.debug(proceso, 'listaPagos: ' + JSON.stringify(listaPagos));

                            if (!utilities.isEmpty(pagos) && pagos.error == true) {
                                var mensaje = pagos.mensaje;
                                log.error(proceso, 'Error Consulta Pagos - Error : ' + mensaje);
                                infoResultado.defaultValue = '<font color="red">' + mensaje + '</font>';
                            }

                            context.response.writePage(form);

                            log.audit(proceso, 'FIN Consulta Pagos');
                            break;

                    }
                }
            } catch (excepcion) {
                log.error(proceso, 'Excepcion : ' + excepcion.message);
            }
        }

        function busquedaPagos(mostrarIncluidos, idSubsidiaria, fechaDesdeConsulta, fechaHastaConsulta, cuentaBancaria, idMoneda, infoPanel) {
            log.audit('busquedaPagos', 'INICIO Consulta Pagos');
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";

            try {
                if (!utilities.isEmpty(idSubsidiaria)) {

                    var esquema = 'https://';
                    var host = url.resolveDomain({
                        hostType: url.HostType.APPLICATION
                    });

                    log.debug('busquedaPagos', 'Mostrar incluidos: ' + mostrarIncluidos + ', idSubsidiaria: ' + idSubsidiaria + ', fechaDesdeConsulta: ' + fechaDesdeConsulta + ', fechaHastaConsulta: ' + fechaHastaConsulta + ', cuentaBancaria: ' + cuentaBancaria+' ,idMoneda: '+ idMoneda);

                    var filtrosPagos = new Array();
                    var arrayPagos = new Array();

                    var filtroSubsidiaria = new Object();
                    filtroSubsidiaria.name = 'subsidiary';
                    filtroSubsidiaria.operator = 'IS';
                    filtroSubsidiaria.values = idSubsidiaria;
                    filtrosPagos.push(filtroSubsidiaria);

                    log.debug('Flag','Pase validacion 1');
                    var filtroMoneda = new Object();
                    filtroMoneda.name = 'currency';
                    filtroMoneda.operator = 'IS';
                    filtroMoneda.values = idMoneda;
                    filtrosPagos.push(filtroMoneda);

                    log.debug('Flag','Pase validacion 2');
                    var filtroFechaDesde = new Object();
                    filtroFechaDesde.name = 'trandate';
                    filtroFechaDesde.operator = 'ONORAFTER'
                    filtroFechaDesde.values = fechaDesdeConsulta;
                    filtrosPagos.push(filtroFechaDesde);

                    log.debug('Flag','Pase validacion 3');
                    var filtroFechaHasta = new Object();
                    filtroFechaHasta.name = 'trandate';
                    filtroFechaHasta.operator = 'ONORBEFORE'
                    filtroFechaHasta.values = fechaHastaConsulta;
                    filtrosPagos.push(filtroFechaHasta);

                    log.debug('Flag','Pase validacion 4');
                    if (!mostrarIncluidos) {
                        log.debug('Flag','Pase validacion 4.5');
                        var filtroIncluido = new Object();
                        filtroIncluido.name = 'custbody_l54_txt_file_procesado';
                        filtroIncluido.operator = 'IS';
                        filtroIncluido.values = 'F';
                        filtrosPagos.push(filtroIncluido);
                    }

                    var filtroExcluido = new Object();
                    filtroExcluido.name = 'custbody_l54_excluir_gen_arc_bank_arg';
                    filtroExcluido.operator = 'IS';
                    filtroExcluido.values = 'F';
                    filtrosPagos.push(filtroExcluido);

                    log.debug('Flag','Pase validacion 5');
                    var filtroCuentaBancaria = new Object();
                    filtroCuentaBancaria.name = 'custbody_l54_cuenta_txt_pago';
                    filtroCuentaBancaria.operator = 'IS'
                    filtroCuentaBancaria.values = cuentaBancaria;
                    filtrosPagos.push(filtroCuentaBancaria);

                    if (!utilities.isEmpty(infoPanel) && infoPanel.length != 0 && !infoPanel[0].incluirPagosM) {
                        var customFilter1 = new Object();
                        customFilter1.name = 'custbody_3k_forma_pago_local';
                        customFilter1.operator = 'NONEOF'
                        customFilter1.values = '1';
                        filtrosPagos.push(customFilter1);
                    }
                    
                    if (!utilities.isEmpty(infoPanel) && infoPanel.length != 0 && !infoPanel[0].incluirAnulados) {
                        var customFilter2 = new Object();
                        customFilter2.name = 'voided';
                        customFilter2.operator = 'IS'
                        customFilter2.values = 'F';
                        filtrosPagos.push(customFilter2);
                    }

                    log.debug('Flag','Pase validacion 7');

                    var searchPagos = utilities.searchSavedPro('customsearch_l54_bank_file_pagos_vp', filtrosPagos);

                    log.debug('Flag','Pase validacion 8');

                    if (!searchPagos.error && !utilities.isEmpty(searchPagos.objRsponseFunction.result) && searchPagos.objRsponseFunction.result.length > 0) {

                        var pagosResultSet = searchPagos.objRsponseFunction.result;
                        var pagosResultSearch = searchPagos.objRsponseFunction.search;

                        for (var k = 0; k < pagosResultSet.length; k++) {
                            var objPagos = {};
                            objPagos.pagoID = pagosResultSet[k].getValue({ name: pagosResultSearch.columns[0] });
                            objPagos.pagoNroDoc = pagosResultSet[k].getValue({ name: pagosResultSearch.columns[1] });
                            objPagos.pagoFechaPago = pagosResultSet[k].getValue({ name: pagosResultSearch.columns[2] });
                            objPagos.pagoProveedor = pagosResultSet[k].getValue({ name: pagosResultSearch.columns[3] });
                            objPagos.pagoImporte = pagosResultSet[k].getValue({ name: pagosResultSearch.columns[4] });
                            objPagos.pagoMoneda = pagosResultSet[k].getValue({ name: pagosResultSearch.columns[5] });
                            objPagos.pagoTipoCambio = pagosResultSet[k].getValue({ name: pagosResultSearch.columns[6] });
                            objPagos.pagoIncluido = pagosResultSet[k].getValue({ name: pagosResultSearch.columns[7] });
                            objPagos.pagoRetenciones = pagosResultSet[k].getValue({ name: pagosResultSearch.columns[8] });
                            objPagos.nrotransaccion = pagosResultSet[k].getValue({ name: pagosResultSearch.columns[9] });

                            var linkRegistro = url.resolveRecord({ recordType: 'vendorpayment', recordId: objPagos.pagoID, isEditMode: false });
                            objPagos.pagoLink = esquema + host + linkRegistro;

                            arrayPagos.push(objPagos);
                        }
                    }

                    log.debug('busquedaPagos', 'arrayPagos: ' + JSON.stringify(arrayPagos));

                    respuesta.result = arrayPagos;
                } else {
                    respuesta.error = true;
                    respuesta.mensaje = "Debe indicar la Subsidiaria y la Moneda";
                    log.error('busquedaPagos', respuesta.mensaje);
                }
            } catch (excepcion) {
                respuesta.error = true;
                respuesta.mensaje = "Excepcion Consultando Pagos - Excepcion : " + excepcion.message;
                log.error('busquedaPagos', respuesta.mensaje);
            }

            log.audit('busquedaPagos', 'FIN Consulta Pagos');
            return respuesta;
        }

        function listarPagos(sublistPagos, pagos, mostrarIncluidos, instCalculoRet, aux) {

            log.audit('listarPagos', 'INICIO Listar Pagos');

            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";

            try {
                if (!utilities.isEmpty(pagos) && pagos.length > 0) {

                    var numLinea = 0;

                    for (var i = 0; i < pagos.length; i++) {

                        var incluir = ((!pagos[i].pagoIncluido && !mostrarIncluidos) || mostrarIncluidos);
                        //log.debug('listarPagos', 'incluir: ' + incluir);

                        if (incluir) {

                            if (pagos[i].pagoIncluido) {
                                sublistPagos.setSublistValue({
                                    id: 'procesar',
                                    line: numLinea,
                                    value: 'F'
                                });

                                if (!instCalculoRet) {
                                    aux.updateDisplayType({
                                        displayType: serverWidget.FieldDisplayType.HIDDEN
                                    });
                                }

                                sublistPagos.setSublistValue({
                                    id: 'incluido',
                                    line: numLinea,
                                    value: 'T'
                                });
                            } else {
                                sublistPagos.setSublistValue({
                                    id: 'procesar',
                                    line: numLinea,
                                    value: 'T'
                                });

                                sublistPagos.setSublistValue({
                                    id: 'incluido',
                                    line: numLinea,
                                    value: 'F'
                                });
                            }

                            if (!utilities.isEmpty(pagos[i].pagoID)) {
                                sublistPagos.setSublistValue({
                                    id: 'idpago',
                                    line: numLinea,
                                    value: pagos[i].pagoID
                                });
                            }

                            if (!utilities.isEmpty(pagos[i].nrotransaccion)) {
                                sublistPagos.setSublistValue({
                                    id: 'nrotransaccion',
                                    line: numLinea,
                                    value: pagos[i].nrotransaccion
        
                                });
                            }

                            if (!utilities.isEmpty(pagos[i].pagoFechaPago)) {
                                sublistPagos.setSublistValue({
                                    id: 'fechapago',
                                    line: numLinea,
                                    value: pagos[i].pagoFechaPago
                                });
                            }

                            if (!utilities.isEmpty(pagos[i].pagoProveedor)) {
                                sublistPagos.setSublistValue({
                                    id: 'idproveedor',
                                    line: numLinea,
                                    value: pagos[i].pagoProveedor
                                });
                            }

                            if (!utilities.isEmpty(pagos[i].pagoImporte)) {

                                var impPago = format.format({ value: parseFloat(pagos[i].pagoImporte).toFixed(2), type: format.Type.CURRENCY });

                                sublistPagos.setSublistValue({
                                    id: 'importe',
                                    line: numLinea,
                                    value: impPago
                                });
                            }


                            if (!utilities.isEmpty(pagos[i].pagoRetenciones) && instCalculoRet == true) {

                                var impRetenciones = format.format({ value: parseFloat(pagos[i].pagoRetenciones).toFixed(2), type: format.Type.CURRENCY });

                                sublistPagos.setSublistValue({
                                    id: 'impretencion',
                                    line: numLinea,
                                    value: impRetenciones
                                });

                            }

                            if (!utilities.isEmpty(pagos[i].pagoMoneda)) {
                                sublistPagos.setSublistValue({
                                    id: 'moneda',
                                    line: numLinea,
                                    value: pagos[i].pagoMoneda
                                });
                            }

                            if (!utilities.isEmpty(pagos[i].pagoTipoCambio)) {
                                sublistPagos.setSublistValue({
                                    id: 'tipocambio',
                                    line: numLinea,
                                    value: pagos[i].pagoTipoCambio
                                });
                            }

                            if (!utilities.isEmpty(pagos[i].pagoNroDoc) && !utilities.isEmpty(pagos[i].pagoLink)) {

                                var valor = '<a href="' + pagos[i].pagoLink + '"> ' + pagos[i].pagoNroDoc + ' </a>';

                                sublistPagos.setSublistValue({
                                    id: 'nrodocumento',
                                    line: numLinea,
                                    value: valor
                                });
                            }

                            numLinea++;
                        }
                    }

                } else {
                    respuesta.error = true;
                    respuesta.mensaje = "No existen Pagos para mostrar.";
                    log.error('listarPagos', respuesta.mensaje);
                }
            } catch (excepcion) {
                respuesta.error = true;
                respuesta.mensaje = "Error listando los Pagos - Excepcion : " + excepcion.message;
                log.error('listarPagos', respuesta.mensaje);
            }

            log.audit('listarPagos', 'FIN Listar Pagos');
            return respuesta;
        }

        function generarArchivo(sublistPagos, request) {
            log.audit(proceso, 'INICIO Proceso que invoca Map/Reduce de Generación Archivo de Pagos');

            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";

            try {

                if (!utilities.isEmpty(request.parameters.listadopagosdata)) {

                    var idSubsidiaria = request.parameters.custpage_subsidiaria;
                    var fechaCabecera = request.parameters.custpage_fechaarchivo;
                    var datoBancario = request.parameters.custpage_datobanco;
                    var moneda = request.parameters.custpage_moneda;
                    var bancoCliente = request.parameters.custpage_bancocliente;

                    var delimiterCampos = /\u0001/;
                    var delimiterArray = /\u0002/;

                    var sublistaPagos = request.parameters.listadopagosdata.split(delimiterArray);

                    log.audit(proceso, 'sublistaPagos.length: ' + JSON.stringify(sublistaPagos.length));
                    log.audit(proceso, 'Array Data: ' + JSON.stringify(sublistaPagos));

                    if (utilities.isEmpty(request.parameters.custpage_subsidiaria)) {
                        respuesta.error = true;
                        respuesta.mensaje = "No se seleccionó la Subsidiaria.";
                        log.error(proceso, respuesta.mensaje);
                    }

                    if (utilities.isEmpty(request.parameters.custpage_moneda)) {
                        respuesta.error = true;
                        respuesta.mensaje = "No se seleccionó la Moneda.";
                        log.error(proceso, respuesta.mensaje);
                    }

                    if (!utilities.isEmpty(sublistaPagos) && sublistaPagos.length > 0 && !respuesta.error) {

                        var pagosPorProcesar = [];

                        for (var i = 0; respuesta.error == false && i < sublistaPagos.length; i++) {
                            if (!utilities.isEmpty(sublistaPagos[i])) {
                                var columnas = sublistaPagos[i].split(delimiterCampos);

                                if (!utilities.isEmpty(columnas)) {
                                    if (columnas[0] == 'T') { //CheckBox Procesar
                                        if (!utilities.isEmpty(columnas[1])) {
                                            var idPago = parseInt(columnas[1]);
                                            pagosPorProcesar.push(idPago);
                                        }
                                    }
                                }
                            }
                        }

                        var idUsuario = runtime.getCurrentUser().id;

                        if (pagosPorProcesar.length > 0 && !respuesta.error) {
                            //var idScriptMapRed = "";
                            var objScriptMR = encontrarScriptMP(JSON.stringify(pagosPorProcesar), idUsuario, idSubsidiaria, fechaCabecera, datoBancario, moneda, bancoCliente);
                            
                            if(!utilities.isEmpty(objScriptMR)){
                                //var objParametros = {};
                            
                                log.debug(proceso, 'objParametros a Enviar: ' + JSON.stringify(objScriptMR.objParametros));

                                respuesta = createAndSubmitMapReduceJob(objScriptMR.idScriptMapRed, objScriptMR.objParametros);
                            }else{
                                respuesta.error = true;
                                respuesta.mensaje = "No se seleccionó ningún script asociado al banco que se quiere generar txt.";
                                log.error(proceso, respuesta.mensaje);
                            }
                            
                        } else {
                            respuesta.error = true;
                            respuesta.mensaje = "No se seleccionó ningún Pago para realizar la Generación Archivo de Pagos.";
                            log.error(proceso, respuesta.mensaje);
                        }
                    } else {
                        respuesta.error = true;
                        respuesta.mensaje = "No se realizó la búsqueda de Pagos de una Subsidiaria.";
                        log.error(proceso, respuesta.mensaje);
                    }
                } else {
                    respuesta.error = true;
                    respuesta.mensaje = "No se realizó la búsqueda de Pagos de una Subsidiaria.";
                    log.error(proceso, respuesta.mensaje);
                }

            } catch (excepcion) {
                respuesta.error = true;
                respuesta.mensaje = "Error Generando Parámetros para el Map/Reduce de Generación Archivo de Pagos - Excepcion : " + excepcion.message;
                log.error(proceso, respuesta.mensaje);
            }
            log.audit(proceso, 'FIN Proceso que invoca Map/Reduce de Generación Archivo de Pagos');
            return respuesta;
        }

        function encontrarScriptMP(pagosPorProcesar, idUsuario, idSubsidiaria, fechaCabecera, datoBancario, moneda, bancoCliente){
            var objScriptMP = new Object();
            var objParametros = {};
            var currScript = runtime.getCurrentScript();
            var paramGalicia = currScript.getParameter('custscript_l54_txt_banco_arch_galicia');
            var paramIndistrial = currScript.getParameter('custscript_l54_txt_banco_arch_industrial');
            
            if(paramGalicia == bancoCliente){
                log.debug("seleccionarIdMapRed","Banco Galicia Selecionado");
                objScriptMP.idScriptMapRed = 'customscript_l54_txt_galicia_mr';
                objParametros.custscript_l54_txt_galicia_mr_pagos = pagosPorProcesar;
                objParametros.custscript_l54_txt_galicia_mr_userd = idUsuario;
                objParametros.custscript_l54_txt_galicia_mr_subs = idSubsidiaria;
                objParametros.custscript_l54_txt_galicia_mr_fecha = fechaCabecera;
                objParametros.custscript_l54_txt_galicia_mr_dbco = datoBancario;
                objParametros.custscript_l54_txt_galicia_mr_mone = moneda;
                objParametros.custscript_l54_txt_galicia_mr_bank = bancoCliente;
                objScriptMP.objParametros = objParametros;
            }else if(paramIndistrial == bancoCliente){
                var objFieldLookUp = search.lookupFields({
                    type: 'currency',
                    id: moneda,
                    columns: ['symbol']
                });
                objScriptMP.idScriptMapRed = 'customscript_l54_txt_industrial_mr';
                objParametros.custscript_l54_txt_industrial_mr_pagos = pagosPorProcesar;
                objParametros.custscript_l54_txt_industrial_mr_userd = idUsuario;
                objParametros.custscript_l54_txt_industrial_mr_subs = idSubsidiaria;
                objParametros.custscript_l54_txt_industrial_mr_fecha = fechaCabecera;
                objParametros.custscript_l54_txt_industrial_mr_dbco = datoBancario;
                objParametros.custscript_l54_txt_industrial_mr_curr = objFieldLookUp.symbol;
                objParametros.custscript_l54_txt_industrial_mr_bank = bancoCliente;
                objScriptMP.objParametros = objParametros;
            } else{
                log.debug("Error","El banco seleccionado no tiene un proceso de generacion TXT para pagos de proveedores")
            }


            return objScriptMP;
        }

        function createAndSubmitMapReduceJob(idScript, parametros) {
            log.debug('createAndSubmitMapReduceJob', 'INICIO Invocacion Script MAP/REDUCE');
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";
            try {
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: idScript,
                    params: parametros
                });
                var mrTaskId = mrTask.submit();
                var taskStatus = task.checkStatus(mrTaskId);
                respuesta.estado = taskStatus;
            } catch (excepcion) {
                respuesta.error = true;
                respuesta.mensaje = "Excepcion Invocando el Script MAP/REDUCE - Excepcion : " + excepcion.message;
                log.error('createAndSubmitMapReduceJob', respuesta.mensaje);
            }
            log.debug('createAndSubmitMapReduceJob', 'FIN Invocacion Script MAP/REDUCE');
            return respuesta;
        }
        function consultarPanel(idSubsidiaria, idBanco) {

            //Inicio - Consulta "AR - Banco Galicia File - Panel Config."
            var arrayPanel = new Array();
            var filtrosPanelConfig = new Array();

            var filtroSubsidiaria = new Object();
            filtroSubsidiaria.name = 'custrecord_l54_pago_panel_sub';
            filtroSubsidiaria.operator = 'IS';
            filtroSubsidiaria.values = idSubsidiaria;
            filtrosPanelConfig.push(filtroSubsidiaria);

            var filtroBanco = new Object();
            filtroBanco.name = 'custrecord_l54_pago_panel_banco_file';
            filtroBanco.operator = 'IS';
            filtroBanco.values = idBanco;
            filtrosPanelConfig.push(filtroBanco);

            var searchPanelConfig = utilities.searchSavedPro('customsearch_l54_pagos_file_panel_conf', filtrosPanelConfig);

            if (!searchPanelConfig.error && !utilities.isEmpty(searchPanelConfig.objRsponseFunction.result) && searchPanelConfig.objRsponseFunction.result.length > 0) {

                var panelConfigResultSet = searchPanelConfig.objRsponseFunction.result;
                var panelConfigResultSearch = searchPanelConfig.objRsponseFunction.search;

                log.debug(proceso, 'panelConfigResultSet.length: ' + panelConfigResultSet.length);
                log.debug(proceso, 'panelConfigResultSet ' + JSON.stringify(panelConfigResultSet));

                if (panelConfigResultSet.length == 1) {
                    for (var k = 0; k < panelConfigResultSet.length; k++) {
                        var objPanel = {};
                        objPanel.panelNroSecuencia = panelConfigResultSet[k].getValue({ name: panelConfigResultSearch.columns[9] });
                        objPanel.panelInstCalcRet = panelConfigResultSet[k].getValue({ name: panelConfigResultSearch.columns[10] });
                        objPanel.incluirAnulados = panelConfigResultSet[k].getValue({ name: panelConfigResultSearch.columns[13] });
                        objPanel.incluirPagosM = panelConfigResultSet[k].getValue({ name: panelConfigResultSearch.columns[14] });
                        arrayPanel.push(objPanel);
                    }
                }
            }
            //Fin - Consulta "AR - Banco Galicia File - Panel Config.
            return arrayPanel;
        }

        return {
            onRequest: onRequest
        }
    });