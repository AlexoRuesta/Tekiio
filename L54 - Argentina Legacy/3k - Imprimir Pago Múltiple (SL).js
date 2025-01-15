/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */
 define(
    [
        'N/record', 'L54/utilidades', 'N/file', 'N/runtime', 'N/config', 'N/render'
    ],
    function (record, utilidades, file, runtime, config, render) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {

            try {

                var guardarImpresion = runtime.getCurrentScript().getParameter('custscript_3k_imp_pag_mult_sl_guard_imp');
                log.debug('onRequest', 'LINE 23 - runtime checkGovernance: ' + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());
                var request = context.request;
                log.debug('onRequest', 'INICIO - Parametros recibidos: ' + JSON.stringify(context.request.parameters));
                var type = (context.request.parameters.tipoPago == 'VENDPYMT') ? 'vendorpayment' : (context.request.parameters.tipoPago == 'CUSTDEP') ? 'customerdeposit' : 'customerpayment';

                var idPago = context.request.parameters.idPago;
                var descargarPDF = context.request.parameters.descargarPDF;

                var recPayment = record.load({
                    type: type,
                    id: idPago
                });

                log.debug('onRequest', 'INICIO - Record Payment : ' + JSON.stringify(recPayment));

                var idSavedSearchFacturas = "customsearch_3k_facturas_pagas";
                var idFiltroFacturas = "internalid";
                var idJoin = "payingtransaction";
                var idSavedSearchRetenciones = "customsearch_l54_retenciones";
                var idFiltroRetenciones = "internalid";
                var idFiltroRetenciones2 = "isdefaultbilling";
                var idjoinRetenciones = 'custrecord_l54_ret_ref_pago_prov';
                var idjoinRetenciones2 = 'custrecord_l54_ret_ref_proveedor';
                var idTemplateFile = '';
                var imprimirRetencionesPagoMultiple = false;
                var tieneLocalizacionesArgentinas = false;
                var idFolderPdfPagosMultiples = '';
                var fileHtml = '';
                var resultsDatosImpositivos = [];
                //var arrayPagosMultiples = [];
                //var objPagosMultiples = {};
                var addressCustomer = '';
                var customerInfo = {};
                var response = {};
                var resultsConfigPagosMultiples = [];
                var subsidiariaParametrizada = context.request.parameters.subsidiaria;

                // Inicio ---- Obtención de Config. Pagos Múltiples
                var filtro = {};
                var filtros = [];
                if (!utilidades.isEmpty(subsidiariaParametrizada)) {
                    filtro.name = 'custrecord_3k_imp_pag_mult_conf_subsidia';
                    filtro.operator = 'IS';
                    filtro.values = subsidiariaParametrizada;
                    filtros.push(filtro);
                }

                var objResultSet = utilidades.searchSavedPro('customsearch_3k_imp_pag_mult_config', filtros);

                if (objResultSet.error) {
                    log.debug('beforeLoad', 'LINE 72 - Obtener Config. Impresión Pagos Múltiples - Error Consultando searchSavedPro: ' + objResultSet.descripcion);
                } else {
                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;
                    log.debug('onRequest', 'LINE 76 - Config. Pagos Múltiples - resultSet: ' + JSON.stringify(resultSet));

                    if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                        resultsConfigPagosMultiples = resultSet;
                        imprimirRetencionesPagoMultiple = resultSet[0].getValue({ name: resultSearch.columns[0] });
                        idTemplateFile = resultSet[0].getValue({ name: resultSearch.columns[1] });
                        idFolderPdfPagosMultiples = resultSet[0].getValue({ name: resultSearch.columns[2] });
                        tieneLocalizacionesArgentinas = resultSet[0].getValue({ name: resultSearch.columns[10] });
                    }
                }
                // Fin ---- Obtención de Config. Pagos Múltiples

                if (!utilidades.isEmpty(resultsConfigPagosMultiples) && resultsConfigPagosMultiples.length > 0) {

                    if (!utilidades.isEmpty(subsidiariaParametrizada) && subsidiariaParametrizada != 1) {

                        var recSubsidiary = record.load({
                            type: 'subsidiary',
                            id: subsidiariaParametrizada
                        });

                    } else {

                        var companyInfo = config.load({
                            type: config.Type.COMPANY_INFORMATION
                        });

                        if (type == 'vendorpayment') {
                            var recSubsidiary = recPayment;

                            if (!utilidades.isEmpty(companyInfo.getValue({ fieldId: 'mainaddress_text' })))
                                recSubsidiary.setValue({ fieldId: 'mainaddress_text', value: companyInfo.getValue({ fieldId: 'mainaddress_text' }) });

                            if (!utilidades.isEmpty(companyInfo.getValue({ fieldId: 'mainaddress_text' })))
                                recSubsidiary.setValue({ fieldId: 'address', value: companyInfo.getValue({ fieldId: 'mainaddress_text' }) });

                            if (!utilidades.isEmpty(companyInfo.getValue({ fieldId: 'employerid' })))
                                recSubsidiary.setValue({ fieldId: 'custbody_54_cuit_entity', value: companyInfo.getValue({ fieldId: 'employerid' }) });

                            if (!utilidades.isEmpty(companyInfo.getValue({ fieldId: 'legalname' })))
                                recSubsidiary.setValue({ fieldId: 'custbody_l54_razon_social_prov', value: companyInfo.getValue({ fieldId: 'legalname' }) });
                        }
                    }

                    if (type == 'customerpayment' || type == 'customerdeposit') {

                        var companyInfo = config.load({
                            type: config.Type.COMPANY_INFORMATION
                        });

                        var recCliente = record.load({
                            type: record.Type.CUSTOMER,
                            id: recPayment.getValue({ fieldId: 'customer' })
                        });

                        var cantDirCliente = recCliente.getLineCount({ sublistId: 'addressbook' });

                        for (var i = 0; i < cantDirCliente; i++) {
                            if (recCliente.getSublistValue({ sublistId: 'addressbook', fieldId: 'defaultshipping', line: i }) == true) {
                                addressCustomer = recCliente.getSublistValue({ sublistId: 'addressbook', fieldId: 'addressbookaddress_text', line: i });
                            }
                        }

                        customerInfo = {
                            addressCompany: companyInfo.getValue({ fieldId: 'mainaddress_text' }),
                            addressCustomer: addressCustomer,
                            companyName: recCliente.getValue({ fieldId: 'companyname' })
                        }
                    }

                    var renderer = render.create();

                    if (!utilidades.isEmpty(imprimirRetencionesPagoMultiple) && imprimirRetencionesPagoMultiple && type == 'vendorpayment' && !utilidades.isEmpty(tieneLocalizacionesArgentinas) && tieneLocalizacionesArgentinas) {
                        // Inicio ---- Obtención de Datos impositivos de la Empresa
                        var filtro = {};
                        var filtros = [];
                        if (!utilidades.isEmpty(subsidiariaParametrizada)) {
                            filtro.name = 'custrecord_l54_subsidiaria'; // internalid
                            filtro.operator = 'IS';
                            filtro.values = subsidiariaParametrizada;
                            filtros.push(filtro);
                        }

                        var objResultSet = utilidades.searchSavedPro('customsearch_3k_datos_imp_pago_multiple', filtros);

                        if (objResultSet.error) {
                            log.debug('beforeLoad', 'LINE 92 - Obtener Datos Impositivos - Error Consultando searchSavedPro: ' + objResultSet.descripcion);
                        } else {
                            var resultSet = objResultSet.objRsponseFunction.result;
                            var resultSearch = objResultSet.objRsponseFunction.search;
                            log.debug('onRequest', 'LINE 166 - Datos Impositivos - resultSet: ' + JSON.stringify(resultSet));

                            if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                                resultsDatosImpositivos = resultSet;
                            }
                        }
                        // Fin ---- Obtención de Datos Impositivos de la Empresa
                    }

                    if (!utilidades.isEmpty(idTemplateFile)) {
                        fileHtml = file.load({
                            id: idTemplateFile
                        }); //load the HTML file template

                        // Inicio -- Seteo la configuración inicial del template
                        var carpetaGuardarPago = idFolderPdfPagosMultiples;
                        var template = fileHtml.getContents(); //get the contents
                        template = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">" + template;
                        renderer.templateContent = template;
                        // Fin -- Seteo la configuración inicial del template

                        if (!utilidades.isEmpty(resultsDatosImpositivos) && resultsDatosImpositivos.length > 0) {
                            renderer.addSearchResults({
                                templateName: 'datosImpositivos',
                                searchResult: resultsDatosImpositivos
                            });
                        }

                        log.debug('onRequest', 'LINE 131 - runtime checkGovernance: ' + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());

                        // Inicio ---- Obtención de facturas pagas
                        /*var filtro = {};
                        var filtros = [];
                        filtro.name = idFiltroFacturas; // internalid
                        filtro.operator = 'IS';
                        filtro.join = idJoin;
                        filtro.values = idPago;
                        filtros.push(filtro);

                        var objResultSet = utilidades.searchSavedPro(idSavedSearchFacturas, filtros);

                        if (objResultSet.error) {
                            log.debug('beforeLoad', 'LINE 96 - Obtener Facturas pagas - Error Consultando searchSavedPro: ' + objResultSet.descripcion);
                        } else {
                            var resultSet = objResultSet.objRsponseFunction.result;
                            var resultSearch = objResultSet.objRsponseFunction.search;
                            log.debug('onRequest', 'LINE 100 - Facturas - resultSet: ' + JSON.stringify(resultSet));

                            if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                                renderer.addSearchResults({
                                    templateName: 'resultsFacturas',
                                    searchResult: resultSet
                                });
                            }
                        }*/

                        if (type == 'customerpayment' || type == 'vendorpayment') {
                            // INICIO OBTENCION DE FACTURAS
                            var transaccionesVinculadas = getFacturas(idPago);
                            log.debug('onRequest', "getFacturas RESPONSE: " + JSON.stringify(transaccionesVinculadas));
                        } else if (type == 'customerdeposit') {
                            // INICIO OBTENCION DE ORDENES DE VENTA
                            var ovID = recPayment.getValue({ fieldId: 'salesorder' })
                            var transaccionesVinculadas = getOV(ovID);
                            log.debug('onRequest', "getOV RESPONSE: " + JSON.stringify(transaccionesVinculadas));
                        }

                        if (!utilidades.isEmpty(transaccionesVinculadas.data) && transaccionesVinculadas.data.length > 0) {
                            renderer.addSearchResults({
                                templateName: 'resultsFacturas',
                                searchResult: transaccionesVinculadas.data
                            });
                        }
                        // Fin ---- Obtenión de facturas pagas

                        if (type == 'customerpayment' || type == 'vendorpayment') {
                            // Inicio ---- Obtencion Retenciones Generadas
                            if (!utilidades.isEmpty(imprimirRetencionesPagoMultiple) && imprimirRetencionesPagoMultiple && type == 'vendorpayment' && !utilidades.isEmpty(tieneLocalizacionesArgentinas) && tieneLocalizacionesArgentinas) {
                                var filtro_1 = {};
                                var filtros = [];
                                filtro_1.name = idFiltroRetenciones;
                                filtro_1.operator = 'IS';
                                filtro_1.join = idjoinRetenciones;
                                filtro_1.values = idPago;
                                filtros.push(filtro_1);

                                var filtro_2 = {};
                                filtro_2.name = idFiltroRetenciones2;
                                filtro_2.operator = 'IS';
                                filtro_2.join = idjoinRetenciones2;
                                filtro_2.values = 'T';
                                filtros.push(filtro_2);

                                var objResultSet = utilidades.searchSavedPro(idSavedSearchRetenciones, filtros);

                                if (objResultSet.error) {
                                    log.debug('beforeLoad', 'LINE 123 - Obtener Reteciones generadas - Error Consultando searchSavedPro: ' + objResultSet.descripcion);
                                } else {
                                    var resultSet = objResultSet.objRsponseFunction.result;
                                    var resultSearch = objResultSet.objRsponseFunction.search;
                                    log.debug('onRequest', 'LINE 127 - Retenciones - resultSet: ' + JSON.stringify(resultSet));

                                    if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                                        renderer.addSearchResults({
                                            templateName: 'resultsRetenciones',
                                            searchResult: resultSet
                                        });
                                    }
                                }
                            }
                            // Fin ---- Obtención Retenciones Generadas
                        }

                        if (!utilidades.isEmpty(recSubsidiary)) {
                            renderer.addRecord({
                                templateName: 'recSubsidiary',
                                record: recSubsidiary
                            });
                        }

                        if (!utilidades.isEmpty(resultsConfigPagosMultiples) && resultsConfigPagosMultiples.length > 0) {
                            renderer.addSearchResults({
                                templateName: 'resultsConfigPagosMultiples',
                                searchResult: resultsConfigPagosMultiples
                            });
                        }

                        renderer.addRecord({
                            templateName: 'infoPago',
                            record: recPayment
                        });

                        // Inicio ---- Obtención de Pago múltiple con cartera de cheques
                        var cantPagosCartera = recPayment.getLineCount({
                            sublistId: 'custpage_sublistcarteracheques'
                        });

                        var arrayCurrencyCartera = [];
                        var arrayPagosCartera = [];

                        for (var i = 0; !utilidades.isEmpty(cantPagosCartera) && i < cantPagosCartera; i++) {

                            var seleccionar = recPayment.getSublistValue({ sublistId: 'custpage_sublistcarteracheques', fieldId: 'fld_chq_seleccionar', line: i });
                            if (seleccionar) {
                                var datosPagosCartera = {};
                                //datosPagosCartera.pago = recPayment.getSublistText({ sublistId: 'custpage_sublistcarteracheques', fieldId: 'fld_chq_forma_pago', line: i });
                                datosPagosCartera.pago = 'Cheques';
                                datosPagosCartera.moneda = recPayment.getSublistText({ sublistId: 'custpage_sublistcarteracheques', fieldId: 'fld_chq_moneda', line: i }).toUpperCase();
                                datosPagosCartera.amount = parseFloat(recPayment.getSublistValue({ sublistId: 'custpage_sublistcarteracheques', fieldId: 'fld_chq_importe', line: i }), 10);
                                datosPagosCartera.tipoCambio = round(parseFloat(recPayment.getSublistValue({ sublistId: 'custpage_sublistcarteracheques', fieldId: 'fld_chq_tc', line: i }), 10), 4);
                                datosPagosCartera.originAmount = parseFloat(recPayment.getSublistValue({ sublistId: 'custpage_sublistcarteracheques', fieldId: 'fld_chq_importe_origen', line: i }), 10);

                                datosPagosCartera.formaPago = recPayment.getSublistText({ sublistId: 'custpage_sublistcarteracheques', fieldId: 'fld_chq_forma_pago', line: i }).toUpperCase();
                                datosPagosCartera.nroCheque = recPayment.getSublistValue({ sublistId: 'custpage_sublistcarteracheques', fieldId: 'fld_chq_nro', line: i });
                                datosPagosCartera.fechaDiferida = recPayment.getSublistText({ sublistId: 'custpage_sublistcarteracheques', fieldId: 'fld_chq_fecha_diferida', line: i });

                                arrayPagosCartera.push(datosPagosCartera);
                            }
                        }
                        log.debug('onRequest', 'arrayPagosCartera: ' + JSON.stringify(arrayPagosCartera));
                        // Fin ---- Obtención de Pago múltiple con cartera de cheques

                        arrayCurrencyCartera = totalizarMonedas(arrayPagosCartera);
                        log.debug('onRequest', 'arrayCurrencyCartera: ' + JSON.stringify(arrayCurrencyCartera));

                        // Inicio ---- Obtención de Pago múltiple con efectivo
                        var cantPagosEfectivo = recPayment.getLineCount({
                            sublistId: 'recmachcustrecord_3k_cobranza_efec_payment_id'
                        });

                        var arrayCurrencyEfectivo = [];
                        var arrayPagosEfectivo = [];

                        for (var i = 0; !utilidades.isEmpty(cantPagosEfectivo) && i < cantPagosEfectivo; i++) {

                            var datosPagosEfectivo = {};
                            //datosPagosEfectivo.pago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_efec_payment_id', fieldId: 'custrecord_3k_cobranza_efec_payment_meth', line: i });
                            datosPagosEfectivo.pago = 'Efectivo';
                            datosPagosEfectivo.moneda = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_efec_payment_id', fieldId: 'custrecord_3k_cobranza_efec_currency', line: i }).toUpperCase();
                            datosPagosEfectivo.amount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_efec_payment_id', fieldId: 'custrecord_3k_cobranza_efec_amount', line: i }), 10);
                            datosPagosEfectivo.tipoCambio = round(parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_efec_payment_id', fieldId: 'custrecord_3k_cobranza_efec_tc', line: i }), 10), 4);
                            datosPagosEfectivo.originAmount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_efec_payment_id', fieldId: 'custrecord_3k_cobranza_efec_amount_orig', line: i }), 10);

                            datosPagosEfectivo.formaPago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_efec_payment_id', fieldId: 'custrecord_3k_cobranza_efec_payment_meth', line: i });

                            arrayPagosEfectivo.push(datosPagosEfectivo);
                        }
                        log.debug('onRequest', 'arrayPagosEfectivo: ' + JSON.stringify(arrayPagosEfectivo));
                        // Fin ---- Obtención de Pago múltiple con efectivo

                        arrayCurrencyEfectivo = totalizarMonedas(arrayPagosEfectivo);
                        log.debug('onRequest', 'arrayCurrencyEfectivo: ' + JSON.stringify(arrayCurrencyEfectivo));

                        log.debug('onRequest', 'LINE 265 - runtime checkGovernance: ' + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());

                        // Inicio ---- Obtención de Pago múltiple con transferencias
                        var cantPagosTransferencias = recPayment.getLineCount({
                            sublistId: 'recmachcustrecord_3k_cobranza_trn_payment_id'
                        });

                        var arrayCurrencyTransferencias = [];
                        var arrayPagosTransferencias = [];

                        for (var i = 0; !utilidades.isEmpty(cantPagosTransferencias) && i < cantPagosTransferencias; i++) {

                            var datosPagosTransferencia = {};
                            //datosPagosTransferencia.pago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_trn_payment_id', fieldId: 'custrecord_3k_cobranza_trn_payment_id', line: i });
                            datosPagosTransferencia.pago = 'Transferencias';
                            datosPagosTransferencia.moneda = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_trn_payment_id', fieldId: 'custrecord_3k_cobranza_trn_currency', line: i }).toUpperCase();
                            datosPagosTransferencia.amount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_trn_payment_id', fieldId: 'custrecord_3k_cobranza_trn_amount', line: i }), 10);
                            datosPagosTransferencia.tipoCambio = round(parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_trn_payment_id', fieldId: 'custrecord_3k_cobranza_trn_tc', line: i }), 10), 4);
                            datosPagosTransferencia.originAmount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_trn_payment_id', fieldId: 'custrecord_3k_cobranza_trn_amount_orig', line: i }), 10);

                            datosPagosTransferencia.formaPago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_trn_payment_id', fieldId: 'custrecord_3k_cobranza_trn_payment_meth', line: i }).toUpperCase();
                            datosPagosTransferencia.fecha = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_trn_payment_id', fieldId: 'custrecord_3k_cobranza_trn_fecha', line: i }).toUpperCase();

                            arrayPagosTransferencias.push(datosPagosTransferencia);
                        }
                        log.debug('onRequest', 'arrayPagosTransferencias: ' + JSON.stringify(arrayPagosTransferencias));
                        // Fin ---- Obtención de Pago múltiple con transferencias

                        arrayCurrencyTransferencias = totalizarMonedas(arrayPagosTransferencias);
                        log.debug('onRequest', 'arrayCurrencyTransferencias: ' + JSON.stringify(arrayCurrencyTransferencias));


                        // Inicio ---- Obtención de Pago múltiple con tarjetas
                        var cantPagosTarjetas = recPayment.getLineCount({
                            sublistId: 'recmachcustrecord_3k_cobranza_tarj_payment_id'
                        });

                        var arrayCurrencyTarjetas = [];
                        var arrayPagosTarjetas = [];

                        for (var i = 0; !utilidades.isEmpty(cantPagosTarjetas) && i < cantPagosTarjetas; i++) {
                            var datosPagosTarjetas = {};
                            //datosPagosTarjetas.pago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_tarj_payment_id', fieldId: 'custrecord_3k_cobranza_tarj_payment_meth', line: i });
                            datosPagosTarjetas.pago = 'Tarjetas';
                            datosPagosTarjetas.moneda = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_tarj_payment_id', fieldId: 'custrecord_3k_cobranza_tarj_currency', line: i }).toUpperCase();
                            datosPagosTarjetas.amount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_tarj_payment_id', fieldId: 'custrecord_3k_cobranza_tarj_amount', line: i }), 10);
                            datosPagosTarjetas.tipoCambio = round(parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_tarj_payment_id', fieldId: 'custrecord_3k_cobranza_tarj_tc', line: i }), 10), 4);
                            datosPagosTarjetas.originAmount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_tarj_payment_id', fieldId: 'custrecord_3k_cobranza_tarj_amount_orig', line: i }), 10);

                            datosPagosTarjetas.formaPago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_tarj_payment_id', fieldId: 'custrecord_3k_cobranza_tarj_payment_meth', line: i }).toUpperCase();
                            datosPagosTarjetas.codAutorizacion = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_tarj_payment_id', fieldId: 'custrecord_3k_cobranza_tarj_cod_autoriza', line: i }).toUpperCase();

                            arrayPagosTarjetas.push(datosPagosTarjetas);
                        }

                        log.debug('onRequest', 'arrayPagosTarjetas: ' + JSON.stringify(arrayPagosTarjetas));
                        // Fin ---- Obtención de Pago múltiple con tarjetas

                        arrayCurrencyTarjetas = totalizarMonedas(arrayPagosTarjetas);
                        log.debug('onRequest', 'arrayCurrencyTarjetas: ' + JSON.stringify(arrayCurrencyTarjetas));

                        // Inicio ---- Obtención de Pago múltiple con cheques propios
                        var arrayPagosChequesPropios = [];
                        var arrayCurrencyChequesPropios = [];
                        if (type == 'vendorpayment') {
                            var cantPagosChequesPropios = recPayment.getLineCount({
                                sublistId: 'recmachcustrecord_3k_cobranza_chq_p_payment_id'
                            });

                            for (var i = 0; !utilidades.isEmpty(cantPagosChequesPropios) && i < cantPagosChequesPropios; i++) {
                                var datosPagosChequesPropios = {};
                                //datosPagosChequesPropios.pago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_chq_p_payment_id', fieldId: 'custrecord_3k_cobranza_chq_p_chequera', line: i });
                                datosPagosChequesPropios.pago = 'Cheques Propios';
                                datosPagosChequesPropios.moneda = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_chq_p_payment_id', fieldId: 'custrecord_3k_cobranza_chq_p_currency', line: i }).toUpperCase();
                                datosPagosChequesPropios.amount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_chq_p_payment_id', fieldId: 'custrecord_3k_cobranza_chq_p_amount', line: i }), 10);
                                datosPagosChequesPropios.tipoCambio = round(parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_chq_p_payment_id', fieldId: 'custrecord_3k_cobranza_chq_p_tc', line: i }), 10), 4);
                                datosPagosChequesPropios.originAmount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_chq_p_payment_id', fieldId: 'custrecord_3k_cobranza_chq_p_amount_orig', line: i }), 10);

                                datosPagosChequesPropios.chequera = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_chq_p_payment_id', fieldId: 'custrecord_3k_cobranza_chq_p_chequera', line: i }).toUpperCase();
                                datosPagosChequesPropios.nroChequePropio = recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_chq_p_payment_id', fieldId: 'custrecord_3k_cobranza_chq_p_nro', line: i });
                                datosPagosChequesPropios.fechaVencimiento = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_chq_p_payment_id', fieldId: 'custrecord_3k_cobranza_chq_p_fecha_venc', line: i });

                                arrayPagosChequesPropios.push(datosPagosChequesPropios);
                            }
                            log.debug('onRequest', 'arrayPagosChequesPropios: ' + JSON.stringify(arrayPagosChequesPropios));
                            // Fin ---- Obtención de Pago múltiple con cheques propios

                            arrayCurrencyChequesPropios = totalizarMonedas(arrayPagosChequesPropios);
                            log.debug('onRequest', 'arrayCurrencyChequesPropios: ' + JSON.stringify(arrayCurrencyChequesPropios));
                        }

                        // Inicio --- Obtención de formas de pago extras para customer payments y customer deposits
                        var arrayPagosRetenciones = [];
                        var arrayCurrencyRetenciones = [];
                        if (type == 'customerpayment' || type == 'customerdeposit') {

                            // Inicio ---- Obtención de Pago múltiple con Retenciones (para las customerpayments)
                            var cantPagosRetencion = recPayment.getLineCount({
                                sublistId: 'recmachcustrecord_3k_cobranza_ret_payment_id'
                            });

                            for (var i = 0; !utilidades.isEmpty(cantPagosRetencion) && i < cantPagosRetencion; i++) {
                                var datosPagosRetenciones = {};
                                //datosPagosRetenciones.pago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_ret_payment_id', fieldId: 'custrecord_3k_cobranza_ret_payment_meth', line: i });
                                datosPagosRetenciones.pago = 'Retenciones';
                                datosPagosRetenciones.moneda = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_ret_payment_id', fieldId: 'custrecord_3k_cobranza_ret_currency', line: i }).toUpperCase();
                                datosPagosRetenciones.amount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_ret_payment_id', fieldId: 'custrecord_3k_cobranza_ret_amount', line: i }), 10);
                                datosPagosRetenciones.tipoCambio = round(parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_ret_payment_id', fieldId: 'custrecord_3k_cobranza_ret_tc', line: i }), 10), 4);
                                datosPagosRetenciones.originAmount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_ret_payment_id', fieldId: 'custrecord_3k_cobranza_ret_amount_orig', line: i }), 10);

                                datosPagosRetenciones.formaPago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_ret_payment_id', fieldId: 'custrecord_3k_cobranza_ret_payment_meth', line: i }).toUpperCase();
                                datosPagosRetenciones.nroComprobante = recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_ret_payment_id', fieldId: 'custrecord_3k_cobranza_ret_nro_comp', line: i });
                                datosPagosRetenciones.fechaComprobante = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_ret_payment_id', fieldId: 'custrecord_3k_cobranza_ret_fecha_em_pago', line: i });

                                arrayPagosRetenciones.push(datosPagosRetenciones);
                            }
                            // Fin ---- Obtención de Pago múltiple con Retenciones (para las customerpayments)
                            log.debug('onRequest', 'arrayPagosRetenciones: ' + JSON.stringify(arrayPagosRetenciones));

                            arrayCurrencyRetenciones = totalizarMonedas(arrayPagosRetenciones);
                            log.debug('onRequest', 'arrayCurrencyRetenciones: ' + JSON.stringify(arrayCurrencyRetenciones));

                            // Inicio ---- Obtención de Pago múltiple con cartera cheques (para las customerpayments y customer deposits)
                            var cantPagosCarteraCheques = recPayment.getLineCount({
                                sublistId: 'recmachcustrecord_3k_cobranza_chq_payment_id'
                            });

                            for (var i = 0; !utilidades.isEmpty(cantPagosCarteraCheques) && i < cantPagosCarteraCheques; i++) {
                                var datosPagCartCheqCustomer = {};
                                //datosPagosRetenciones.pago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_ret_payment_id', fieldId: 'custrecord_3k_cobranza_ret_payment_meth', line: i });
                                datosPagCartCheqCustomer.pago = 'Cheques';
                                datosPagCartCheqCustomer.moneda = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_chq_payment_id', fieldId: 'custrecord_3k_cobranza_chq_currency', line: i }).toUpperCase();
                                datosPagCartCheqCustomer.amount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_chq_payment_id', fieldId: 'custrecord_3k_cobranza_chq_amount', line: i }), 10);
                                datosPagCartCheqCustomer.tipoCambio = round(parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_chq_payment_id', fieldId: 'custrecord_3k_cobranza_chq_tc', line: i }), 10), 4);
                                datosPagCartCheqCustomer.originAmount = parseFloat(recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_chq_payment_id', fieldId: 'custrecord_3k_cobranza_chq_amount_orig', line: i }), 10);

                                datosPagCartCheqCustomer.formaPago = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_chq_payment_id', fieldId: 'custrecord_3k_cobranza_chq_payment_meth', line: i }).toUpperCase();
                                datosPagCartCheqCustomer.nroCheque = recPayment.getSublistValue({ sublistId: 'recmachcustrecord_3k_cobranza_chq_payment_id', fieldId: 'custrecord_3k_cobranza_chq_nro_chq', line: i });
                                datosPagCartCheqCustomer.fechaDiferida = recPayment.getSublistText({ sublistId: 'recmachcustrecord_3k_cobranza_chq_payment_id', fieldId: 'custrecord_3k_cobranza_chq_fecha_dif', line: i });

                                arrayPagosCartera.push(datosPagCartCheqCustomer);
                            }
                            // Fin ---- Obtención de Pago múltiple con cartera cheques (para las customerpayments y customer deposits)
                            log.debug('onRequest', 'arrayPagosCartera: ' + JSON.stringify(arrayPagosCartera));

                            arrayCurrencyCartera = totalizarMonedas(arrayPagosCartera);
                            log.debug('onRequest', 'arrayCurrencyCartera: ' + JSON.stringify(arrayCurrencyCartera));
                        }
                        // Fin --- Obtención de formas de pago extras para customer payments

                        if (type == 'customerpayment' || type == 'vendorpayment') {

                            var imprimirRetenciones = imprimirRetencionesPagoMultiple ? 'true' : 'false';
                            var arrayImportesRetenciones = [];
                            var objImportesRetenciones = {};

                            var importeRetencionSUSS = parseFloat(recPayment.getValue({ fieldId: 'custbody_l54_suss_imp_a_retener' }), 10);
                            var importeRetencionIVA = parseFloat(recPayment.getValue({ fieldId: 'custbody_l54_iva_imp_a_retener' }), 10);
                            var importeRetencionIIBB = parseFloat(recPayment.getValue({ fieldId: 'custbody_l54_iibb_imp_a_retener' }), 10);
                            var importeRetencionMuni = parseFloat(recPayment.getValue({ fieldId: 'custbody_l54_municipal_imp_a_retener' }), 10);
                            var importeRetencionGAN = parseFloat(recPayment.getValue({ fieldId: 'custbody_l54_gan_imp_a_retener' }), 10);
                            var tipoCambio = parseFloat(recPayment.getValue({ fieldId: 'exchangerate' }), 10);
                            var importeTotalAbonadoCurrencyLocal = 0.0;
                            var objImportesCustomerPayment = {};
                            var importeTotalAbonadoCurrencyTransAux = 0.0;

                            if (!utilidades.isEmpty(importeRetencionSUSS) && importeRetencionSUSS > 0) {
                                objImportesRetenciones = {};
                                objImportesRetenciones.tipo = 'SUSS';
                                objImportesRetenciones.amount = formatearNumero(importeRetencionSUSS);
                                objImportesRetenciones.originAmount = formatearNumero(parseFloat(importeRetencionSUSS * tipoCambio, 10));
                                arrayImportesRetenciones.push(objImportesRetenciones);
                            }

                            if (!utilidades.isEmpty(importeRetencionIVA) && importeRetencionIVA > 0) {
                                objImportesRetenciones = {};
                                objImportesRetenciones.tipo = 'IVA';
                                objImportesRetenciones.amount = formatearNumero(importeRetencionIVA);
                                objImportesRetenciones.originAmount = formatearNumero(parseFloat(importeRetencionIVA * tipoCambio, 10));
                                arrayImportesRetenciones.push(objImportesRetenciones);
                            }

                            if (!utilidades.isEmpty(importeRetencionIIBB) && importeRetencionIIBB > 0) {
                                objImportesRetenciones = {};
                                objImportesRetenciones.tipo = 'IIBB';
                                objImportesRetenciones.amount = formatearNumero(importeRetencionIIBB);
                                objImportesRetenciones.originAmount = formatearNumero(parseFloat(importeRetencionIIBB * tipoCambio, 10));
                                arrayImportesRetenciones.push(objImportesRetenciones);
                            }

                            if (!utilidades.isEmpty(importeRetencionMuni) && importeRetencionMuni > 0) {
                                objImportesRetenciones = {};
                                objImportesRetenciones.tipo = 'Municipal';
                                objImportesRetenciones.amount = formatearNumero(importeRetencionMuni);
                                objImportesRetenciones.originAmount = formatearNumero(parseFloat(importeRetencionMuni * tipoCambio, 10));
                                arrayImportesRetenciones.push(objImportesRetenciones);
                            }

                            if (!utilidades.isEmpty(importeRetencionGAN) && importeRetencionGAN > 0) {
                                objImportesRetenciones = {};
                                objImportesRetenciones.tipo = 'GAN';
                                objImportesRetenciones.amount = formatearNumero(importeRetencionGAN);
                                objImportesRetenciones.originAmount = formatearNumero(parseFloat(importeRetencionGAN * tipoCambio, 10));
                                arrayImportesRetenciones.push(objImportesRetenciones);
                            }

                            log.debug('onRequest', 'arrayImportesRetenciones: ' + JSON.stringify(arrayImportesRetenciones));

                        } else {
                            var imprimirRetenciones = 'false';
                            var arrayImportesRetenciones = [];
                        }

                        // Formateo todos los importes de las monedas para que se muestren con comas y puntos.
                        if (type == 'customerpayment') {
                            importeTotalAbonadoCurrencyTransAux = parseFloat((importeTotalAbonadoCurrencyLocal / tipoCambio), 10);
                            objImportesCustomerPayment.importeAbonadoCurrencyTransaction = formatearNumero(round(importeTotalAbonadoCurrencyTransAux, 2));
                            objImportesCustomerPayment.importeFavor = parseFloat(importeTotalAbonadoCurrencyTransAux) - parseFloat(recPayment.getValue({ fieldId: 'applied' }), 10);
                            objImportesCustomerPayment.esDeuda = (objImportesCustomerPayment.importeFavor < 0) ? 'true' : 'false';
                            objImportesCustomerPayment.importeFavor = formatearNumero(round(Math.abs(objImportesCustomerPayment.importeFavor), 2));
                        }

                        for (var i = 0; i < arrayPagosTarjetas.length; i++) {
                            arrayPagosTarjetas[i].originAmount = formatearNumero(parseFloat(arrayPagosTarjetas[i].originAmount, 10));
                            arrayPagosTarjetas[i].amount = formatearNumero(arrayPagosTarjetas[i].amount);
                            arrayPagosTarjetas[i].tipoCambio = formatearNumero(arrayPagosTarjetas[i].tipoCambio);
                        }

                        for (var i = 0; i < arrayPagosCartera.length; i++) {
                            arrayPagosCartera[i].originAmount = formatearNumero(parseFloat(arrayPagosCartera[i].originAmount, 10));
                            arrayPagosCartera[i].amount = formatearNumero(arrayPagosCartera[i].amount);
                            arrayPagosCartera[i].tipoCambio = formatearNumero(arrayPagosCartera[i].tipoCambio);
                        }

                        for (var i = 0; i < arrayPagosTransferencias.length; i++) {
                            arrayPagosTransferencias[i].originAmount = formatearNumero(parseFloat(arrayPagosTransferencias[i].originAmount, 10));
                            arrayPagosTransferencias[i].amount = formatearNumero(arrayPagosTransferencias[i].amount);
                            arrayPagosTransferencias[i].tipoCambio = formatearNumero(arrayPagosTransferencias[i].tipoCambio);
                        }

                        for (var i = 0; i < arrayPagosEfectivo.length; i++) {
                            arrayPagosEfectivo[i].originAmount = formatearNumero(parseFloat(arrayPagosEfectivo[i].originAmount, 10));
                            arrayPagosEfectivo[i].amount = formatearNumero(arrayPagosEfectivo[i].amount);
                            arrayPagosEfectivo[i].tipoCambio = formatearNumero(arrayPagosEfectivo[i].tipoCambio);
                        }

                        if (type == 'customerpayment' || type == 'customerdeposit') {
                            for (var i = 0; i < arrayPagosRetenciones.length; i++) {
                                arrayPagosRetenciones[i].originAmount = formatearNumero(parseFloat(arrayPagosRetenciones[i].originAmount, 10));
                                arrayPagosRetenciones[i].amount = formatearNumero(arrayPagosRetenciones[i].amount);
                                arrayPagosRetenciones[i].tipoCambio = formatearNumero(arrayPagosRetenciones[i].tipoCambio);
                            }

                            for (var i = 0; i < arrayCurrencyRetenciones.length; i++) {
                                arrayCurrencyRetenciones[i].amount = formatearNumero(round(arrayCurrencyRetenciones[i].amount, 2));
                                arrayCurrencyRetenciones[i].originAmount = formatearNumero(round(arrayCurrencyRetenciones[i].originAmount, 2));
                            }
                        }

                        if (type == 'vendorpayment') {
                            for (var i = 0; i < arrayPagosChequesPropios.length; i++) {
                                arrayPagosChequesPropios[i].originAmount = formatearNumero(parseFloat(arrayPagosChequesPropios[i].originAmount, 10));
                                arrayPagosChequesPropios[i].amount = formatearNumero(arrayPagosChequesPropios[i].amount);
                                arrayPagosChequesPropios[i].tipoCambio = formatearNumero(arrayPagosChequesPropios[i].tipoCambio);
                            }

                            for (var i = 0; i < arrayCurrencyChequesPropios.length; i++) {
                                arrayCurrencyChequesPropios[i].amount = formatearNumero(round(arrayCurrencyChequesPropios[i].amount, 2));
                                arrayCurrencyChequesPropios[i].originAmount = formatearNumero(round(arrayCurrencyChequesPropios[i].originAmount, 2));
                            }
                        }

                        for (var i = 0; i < arrayCurrencyTarjetas.length; i++) {
                            arrayCurrencyTarjetas[i].amount = formatearNumero(round(arrayCurrencyTarjetas[i].amount, 2));
                            arrayCurrencyTarjetas[i].originAmount = formatearNumero(round(arrayCurrencyTarjetas[i].originAmount, 2));
                        }

                        for (var i = 0; i < arrayCurrencyCartera.length; i++) {
                            arrayCurrencyCartera[i].amount = formatearNumero(round(arrayCurrencyCartera[i].amount, 2));
                            arrayCurrencyCartera[i].originAmount = formatearNumero(round(arrayCurrencyCartera[i].originAmount, 2));
                        }

                        for (var i = 0; i < arrayCurrencyEfectivo.length; i++) {
                            arrayCurrencyEfectivo[i].amount = formatearNumero(round(arrayCurrencyEfectivo[i].amount, 2));
                            arrayCurrencyEfectivo[i].originAmount = formatearNumero(round(arrayCurrencyEfectivo[i].originAmount, 2));
                        }

                        for (var i = 0; i < arrayCurrencyTransferencias.length; i++) {
                            arrayCurrencyTransferencias[i].amount = formatearNumero(arrayCurrencyTransferencias[i].amount);
                            arrayCurrencyTransferencias[i].originAmount = formatearNumero(arrayCurrencyTransferencias[i].originAmount);
                        }

                        var objDataSource = {
                            customerInfo: customerInfo,
                            objImportesCustomerPayment: objImportesCustomerPayment,
                            imprimirRetenciones: imprimirRetenciones,
                            arrayPagosTarjetas: arrayPagosTarjetas,
                            arrayCurrencyTarjetas: arrayCurrencyTarjetas,
                            arrayPagosCartera: arrayPagosCartera,
                            arrayCurrencyCartera: arrayCurrencyCartera,
                            arrayPagosEfectivo: arrayPagosEfectivo,
                            arrayCurrencyEfectivo: arrayCurrencyEfectivo,
                            arrayPagosTransferencias: arrayPagosTransferencias,
                            arrayCurrencyTransferencias: arrayCurrencyTransferencias,
                            arrayPagosRetenciones: arrayPagosRetenciones,
                            arrayCurrencyRetenciones: arrayCurrencyRetenciones,
                            arrayPagosChequesPropios: arrayPagosChequesPropios,
                            arrayCurrencyChequesPropios: arrayCurrencyChequesPropios,
                            arrayImporteRetenciones: arrayImportesRetenciones
                        }

                        log.debug('onRequest', 'objDataSource: ' + JSON.stringify(objDataSource));

                        renderer.addCustomDataSource({
                            format: render.DataSource.OBJECT,
                            alias: "results",
                            data: objDataSource
                        });

                        var nameType = (type == 'vendorpayment') ? 'VendorPayment' : (type == 'customerdeposit') ? 'CustomerDeposit' : 'CustomerPayment';

                        var namePDF = nameType + '_' + idPago + '_' + new Date() + '.pdf';

                        var stringPDF = renderer.renderAsString();

                        var renderPDF = render.xmlToPdf({
                            xmlString: stringPDF
                        });

                        renderPDF.name = namePDF;
                        var idFile;

                        if (!utilidades.isEmpty(idFolderPdfPagosMultiples)) {
                            renderPDF.folder = carpetaGuardarPago;
                            idFile = renderPDF.save();

                            log.debug('onRequest', 'Value of idFile: ' + idFile + ' - guardarImpresion: ' + guardarImpresion);

                            if (!utilidades.isEmpty(guardarImpresion) && (guardarImpresion == 'T' || guardarImpresion) && !utilidades.isEmpty(idFile)) {

                                //recPayment.setValue({ fieldId: '', value: idFile });
                                //log.debug('onRequest', 'LOG DE CONTROL - Ingreso a guardar PDF de impresión en la transacción - value of field: ' + recPayment.getValue({ fieldId: 'custbody_3k_pdf_pagos_multiples' }));
                                log.debug('onRequest', 'LOG DE CONTROL - Ingreso a guardar PDF de impresión en la transacción');

                                try {
                                    if (type == 'vendorpayment') {
                                        var idTmp = record.submitFields({
                                            type: record.Type.VENDOR_PAYMENT,
                                            id: idPago,
                                            values: {
                                                custbody_3k_pdf_pagos_multiples: idFile
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });
                                    } else if (type == 'customerpayment') {
                                        var idTmp = record.submitFields({
                                            type: record.Type.CUSTOMER_PAYMENT,
                                            id: idPago,
                                            values: {
                                                custbody_3k_pdf_pagos_multiples: idFile
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });
                                    } else {
                                        var idTmp = record.submitFields({
                                            type: record.Type.CUSTOMER_DEPOSIT,
                                            id: idPago,
                                            values: {
                                                custbody_3k_pdf_pagos_multiples: idFile
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields: true
                                            }
                                        });
                                    }
                                } catch (e) {
                                    log.error('onRequest', 'Error grabando PDF de Pago Múltiple - NetSuite error: ' + e.message);
                                }
                            }
                        }

                        log.debug('onRequest', 'LINE 715 - idFile Save: ' + idFile + ' -- folder pdf save: ' + idFolderPdfPagosMultiples);

                        log.debug('onRequest', 'LINE 717 - runtime checkGovernance: ' + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());

                        //if (descargarPDF == true) {
                        context.response.writeFile(renderPDF);
                        //}

                        return true;

                    } else {
                        log.debug('onRequest', 'No se encuentra el Template de Impresión de Pagos Múltiples.');
                    }
                } else {
                    log.debug('onRequest', 'No se encuentra definido el Panel de configuración de Impresión de Pagos Múltiples.');
                }

                log.debug('onRequest', 'LINE 767 - runtime checkGovernance: ' + runtime.getCurrentScript().getRemainingUsage() + ' --- time: ' + new Date());

                //if (descargarPDF == true) {
                context.response.writeLine(JSON.stringify(response));
                //}

                return true;
            } catch (e) {
                log.error("onRequest", "Excepción onRequest. Excepción: " + e.message);

                //if (descargarPDF == true) {
                context.response.writeLine(JSON.stringify({ errorCatch: e.message }));
                //}
            }

            return true;
        }

        function formatearNumero(nStr) {
            nStr += '';
            x = nStr.split('.');
            x1 = x[0];
            x2 = x.length > 1 ? '.' + x[1] : '.00';
            var rgx = /(\d+)(\d{3})/;
            while (rgx.test(x1)) {
                x1 = x1.replace(rgx, '$1' + ',' + '$2');
            }
            x2 = x2.length < 3 ? x2 + '0' : x2;
            return x1 + x2;
        }

        function round(value, decimals) {
            return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
        }

        function totalizarMonedas(arrayLineas) {

            try {

                var arrayCurrencyLineas = [];

                if (!utilidades.isEmpty(arrayLineas) && arrayLineas.length > 0) {
                    for (i = 0; i < arrayLineas.length; i++) {
                        // Objeto para guardar la información de las distintas monedas de la sublista
                        var objInfoMonedas = {
                            moneda: arrayLineas[i].moneda,
                            amount: 0.00,
                            originAmount: 0.00
                        };

                        /*log.debug('onRequest', 'arrayCurrencyLineas: ' + JSON.stringify(arrayCurrencyLineas));
                        log.debug('onRequest', 'arrayCurrencyLineas.length: ' + JSON.stringify(arrayCurrencyLineas.length));
                        log.debug('onRequest', 'arrayLineas[i]: ' + JSON.stringify(arrayLineas[i]));*/

                        if (!utilidades.isEmpty(arrayCurrencyLineas) && arrayCurrencyLineas.length > 0) {
                            for (var j = 0; j < arrayCurrencyLineas.length; j++) {

                                if (arrayCurrencyLineas[j].moneda == arrayLineas[i].moneda) {
                                    arrayCurrencyLineas[j].amount += arrayLineas[i].amount;
                                    arrayCurrencyLineas[j].originAmount += arrayLineas[i].originAmount;
                                    break;
                                }
                            }

                            if (j == arrayCurrencyLineas.length) {
                                arrayCurrencyLineas.push(objInfoMonedas);
                                arrayCurrencyLineas[j].amount += arrayLineas[i].amount;
                                arrayCurrencyLineas[j].originAmount += arrayLineas[i].originAmount;
                            }
                        } else {
                            arrayCurrencyLineas.push(objInfoMonedas);
                            arrayCurrencyLineas[0].amount = arrayLineas[i].amount;
                            arrayCurrencyLineas[0].originAmount = arrayLineas[i].originAmount;
                        }
                    }
                }

                //log.debug('onRequest', 'FINAL - arrayCurrencyLineas: ' + JSON.stringify(arrayCurrencyLineas));
                return arrayCurrencyLineas;

            } catch (e) {
                log.error("onRequest", "totalizarMonedas - Excepción onRequest. Excepción: " + e.message);
                context.response.writeLine(JSON.stringify({ errorCatch: e.message }));
            }

        }

        function getFacturas(recId) {

            var idSavedSearchFacturas = "customsearch_3k_facturas_pagas";
            var idFiltroFacturas = "internalid";
            var idJoin = "payingtransaction";

            var response = { error: false, mensaje: '', data: [] };

            try {
                var filtro = {};

                var filtros = [];
                filtro.name = idFiltroFacturas; // internalid
                filtro.operator = 'IS';
                filtro.join = idJoin;
                filtro.values = recId;
                filtros.push(filtro);

                var objResultSet = utilidades.searchSavedPro(idSavedSearchFacturas, filtros);

                if (!objResultSet.error) {
                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                        // Return results
                        response.data = resultSet
                    }

                } else {
                    response.error = true;
                    response.mensaje = 'Error Consultando searchSavedPro - ' + idSavedSearchFacturas + ': ' + objResultSet.descripcion;
                }

                return response;
            } catch (e) {
                response.error = true;
                response.mensaje = "Netsuite Excepción: " + e.message;
                return response;
            }
        }

        function getOV(ovID) {

            var idSavedSearchFacturas = 'customsearch_3k_ordenes_venta_pm';
            var response = { error: false, mensaje: '', data: [] };

            try {
                var filtro = {};

                var filtros = [];
                filtro.name = "internalid";
                filtro.operator = 'IS';
                filtro.values = [ovID];
                filtros.push(filtro);

                var objResultSet = utilidades.searchSavedPro(idSavedSearchFacturas, filtros);

                if (!objResultSet.error) {
                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                        // Return results
                        response.data = resultSet
                    }

                } else {
                    response.error = true;
                    response.mensaje = 'Error Consultando searchSavedPro - ' + idSavedSearchFacturas + ': ' + objResultSet.descripcion;
                }

                return response;
            } catch (e) {
                response.error = true;
                response.mensaje = "Netsuite Excepción: " + e.message;
                return response;
            }
        }

        return {
            onRequest: onRequest
        };
    });