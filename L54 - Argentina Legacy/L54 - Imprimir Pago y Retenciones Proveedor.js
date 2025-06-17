/*
PC-1: FIX 2017.1 Errores varios
*/
function imprimirPago(request, response) {
	nlapiLogExecution("DEBUG", "imprimirPago_suitelet", "INICIO - ID Interno Pago : " + request.getParameter("idPago") + ",tipoPago:" + request.getParameter("tipoPago"));
	//Dependiendo el tipo de reporte se carga el template correspondiente:
	var campo;
	var campoCarpetaPDF = "custrecord_pagprv_panel_id_pdf_pag";
	var pdfFileName;
	var idSavedSearchFacturas = "customsearch_l54_pag_y_ret";
	var tipoSavedSearchFacturas = "transaction";
	var idFiltroFacturas = "internalid";
	var idFiltroFacturasAdicional = "internalid";
	var idJoin = "payingtransaction";
	var idSavedSearchRetenciones = "customsearch_l54_retenciones";
	var tipoSavedSearchRetenciones = "customrecord_l54_retencion";
	var idFiltroRetenciones = "internalid";
	var idFiltroRetenciones2 = "isdefaultbilling";
	var idjoinRetenciones = "custrecord_l54_ret_ref_pago_prov";
	var idjoinRetenciones2 = "custrecord_l54_ret_ref_proveedor";
	var tipoRecord = "vendorpayment";
	var filtroPanelConf = "custrecord_l54_pagprv_panel_subsidiaria";
	var recordPanelConf = "customrecord_l54_pagoprov_mas_panelctrl";
	var guardarPDF = false;
	var campoPDF = "";
	var campoPDFPagoYRet = "";


	var subsidiariaParametrizada = request.getParameter("subsidiaria");
	var impresionMasiva = request.getParameter("impresionMasiva");
	var enviarPagoyRetencion = request.getParameter("enviarPagoyRetencion");

	if (!isEmpty(subsidiariaParametrizada)) {
		var recSubsidiary = nlapiLoadRecord("subsidiary", subsidiariaParametrizada);
		var filtroLogo = new Array();
		filtroLogo[0] = new nlobjSearchFilter("internalid", null, "is", recSubsidiary.getFieldValue("logo"));
		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#30 filtroLogo " + JSON.stringify(filtroLogo));
		var columns = new Array();
		columns[0] = new nlobjSearchColumn("internalid");
		columns[1] = new nlobjSearchColumn("url");
		var recLogo = nlapiSearchRecord("file", null, filtroLogo, columns);
	} else {
		var companyInfo = nlapiLoadConfiguration("companyinformation");
		/*recSubsidiary.legalname = companyInfo.getFieldValue("legalname");
		recSubsidiary.federalidnumber = companyInfo.getFieldValue("employerid");
		recSubsidiary.mainaddress_text = companyInfo.getFieldValue("mainaddress_text");*/


		var recSubsidiary = nlapiLoadRecord(tipoRecord, request.getParameter("idPago"));
		recSubsidiary.setFieldValue("address", companyInfo.getFieldValue("mainaddress_text"));
		recSubsidiary.setFieldValue("custbody_54_cuit_entity", companyInfo.getFieldValue("employerid"));
		recSubsidiary.setFieldValue("custbody_l54_razon_social_prov", companyInfo.getFieldValue("legalname"));

		var filtroLogo = new Array();
		filtroLogo[0] = new nlobjSearchFilter("internalid", null, "is", companyInfo.getFieldValue("formlogo"));
		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#30 filtroLogo " + JSON.stringify(filtroLogo));
		var columns = new Array();
		columns[0] = new nlobjSearchColumn("internalid");
		columns[1] = new nlobjSearchColumn("url");
		var recLogo = nlapiSearchRecord("file", null, filtroLogo, columns);

		nlapiLogExecution("DEBUG", "imprimirPago_suitelet", "companyinformation: " + recSubsidiary.getFieldValue("custbody_54_cuit_entity"));
	}


	if (!isEmpty(request.getParameter("guardarPago")) && request.getParameter("guardarPago") == "SI") {
		guardarPDF = true;
	}

	switch (request.getParameter("tipoPago")) {
		case "VENDORPAYMENT":
			campo = "custrecord_l54_pagprv_panel_id_tmpl_pag";
			campoCarpetaPDF = "custrecord_pagprv_panel_id_pdf_pag";
			pdfFileName = "PagoProveedor_" + request.getParameter("numero") + ".pdf";
			campoPDF = "custbody_l54_pdf_pago";
			break;
		case "ORDPAGO":
			campo = "custrecord_l54_op_panel_id_tmpl_o_pag";
			campoCarpetaPDF = "custrecord_l54_op_panel_id_pdf_op";
			pdfFileName = "OrdenDePago_" + request.getParameter("numero") + ".pdf";
			idSavedSearchFacturas = "customsearch_l54_det_comp_ord_pago_prov";
			tipoSavedSearchFacturas = "customrecord_l54_orden_pago_det";
			idFiltroFacturas = "custrecord_l54_orden_pago_det_op";
			idFiltroFacturasAdicional = null;
			idJoin = null;
			idSavedSearchRetenciones = "customsearch_l54_det_ret_ord_pag";
			tipoSavedSearchRetenciones = "customrecord_l54_retencion_op";
			idFiltroRetenciones = "custrecord_l54_ret_op_ref_op";
			tipoRecord = "customrecord_l54_orden_pago";
			filtroPanelConf = "custrecord_l54_op_panel_subsidiaria";
			recordPanelConf = "customrecord_l54_op_masivo_panelctrl";
			campoPDF = "custrecord_l54_orden_pago_pdf";
			break;
	}


	// Inicio Obtencion Facturas Pagas
	var filtroFacturas = new Array();
	var i = 0;
	filtroFacturas[i++] = new nlobjSearchFilter(idFiltroFacturasAdicional, idJoin, "is", request.getParameter("idPago"));

	nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#83: ID SAVED SEARCH:" + idSavedSearchFacturas + ",tipo:" + tipoSavedSearchFacturas + ",cantidadFiltros: " + filtroFacturas.length);
	var facturasPagas = nlapiSearchRecord(tipoSavedSearchFacturas, idSavedSearchFacturas, filtroFacturas, null);
	nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#84: facturasPagas:" + JSON.stringify(facturasPagas));

	// Fin Obtencion Facturas Pagas

	// Inicio Obtencion Retenciones Generadas
	var filtroRetenciones = new Array();
	filtroRetenciones[0] = new nlobjSearchFilter(idFiltroRetenciones, idjoinRetenciones, "is", request.getParameter("idPago"));
	filtroRetenciones[1] = new nlobjSearchFilter(idFiltroRetenciones2, idjoinRetenciones2, "is", "T");

	nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#76: ID SAVED SEARCH RET:" + idSavedSearchRetenciones + ",tipo:" + tipoSavedSearchRetenciones);
	var retenciones = nlapiSearchRecord(tipoSavedSearchRetenciones, idSavedSearchRetenciones, filtroRetenciones, null);
	// Fin Obtencion Retenciones Generadas

	nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#78: retenciones:" + JSON.stringify(retenciones));

	var recPagoProveedor = nlapiLoadRecord(tipoRecord, request.getParameter("idPago"));


	nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#82: recPagoProveedor:" + recPagoProveedor);
	// var debugStringRecPagoProveedor = JSON.stringify(recPagoProveedor);
	// var batchSize = 3000;
	// for (var i = 0; i < debugStringRecPagoProveedor.length; i += batchSize) {
	// 	var batch = debugStringRecPagoProveedor.substring(i, i + batchSize);
	// 	nlapiLogExecution("AUDIT", "imprimirPago_suitelet #82: recPagoProveedor: (iteracion=" + i + ")", batch);
	// }
	nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#82: recPagoProveedor:" + JSON.stringify(recPagoProveedor));

	var filtrodatosImpositivos = new Array();
	if (!isEmpty(subsidiariaParametrizada)) {
		var i = 0;
		filtrodatosImpositivos[i++] = new nlobjSearchFilter("custrecord_l54_subsidiaria", null, "is", subsidiariaParametrizada);
	}
	var columns = new Array();
	columns[0] = new nlobjSearchColumn("custrecord_l54_subsidiaria");
	columns[1] = new nlobjSearchColumn("custrecord_l54_resol_ret_iva");
	columns[2] = new nlobjSearchColumn("custrecord_l54_resol_ret_ganancias");
	columns[3] = new nlobjSearchColumn("custrecord_l54_resol_ret_iibb");
	columns[4] = new nlobjSearchColumn("custrecord_l54_resol_ret_suss");
	columns[5] = new nlobjSearchColumn("custrecord_l54_ancho_firma");
	columns[6] = new nlobjSearchColumn("custrecord_l54_ancho_logo");
	columns[7] = new nlobjSearchColumn("custrecord_l54_altura_firma");
	columns[8] = new nlobjSearchColumn("custrecord_l54_altura_logo");
	columns[9] = new nlobjSearchColumn("custrecord_l54_img_firma");
	columns[10] = new nlobjSearchColumn("custrecord_l54_id_template");
	columns[11] = new nlobjSearchColumn("custrecord_l54_id_folder");
	columns[12] = new nlobjSearchColumn("custrecord_l54_op_num");
	columns[13] = new nlobjSearchColumn("custrecord_l54_op_inym");

	var datosImpositivos = nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, filtrodatosImpositivos, columns);
	nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#84: datosImpositivos:" + JSON.stringify(datosImpositivos));

	var renderer = nlapiCreateTemplateRenderer();

	// Inicio Obtener Informacion Panel de Ejecucion
	var subsidiariaDominio = "";
	if (!isEmpty(request.getParameter("subsidiaria"))) {
		subsidiariaDominio = request.getParameter("subsidiaria");
	}

	var iCont = 0;
	var filtroConfiguracion = new Array();
	filtroConfiguracion[iCont++] = new nlobjSearchFilter("isinactive", null, "is", "F");
	if (!isEmpty(subsidiariaDominio))
		filtroConfiguracion[iCont++] = new nlobjSearchFilter(filtroPanelConf, null, "is", subsidiariaDominio);

	var idTemplate = "";
	var carpetaGuardarPago = "";
	if (!isEmpty(datosImpositivos)) {
		idTemplate = datosImpositivos[0].getValue("custrecord_l54_id_template");
		carpetaGuardarPago = datosImpositivos[0].getValue("custrecord_l54_id_folder");
	}

	nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#113: idTemplate:" + idTemplate + ",carpetaGuardarPago:" + carpetaGuardarPago);

	if (!isEmpty(idTemplate)) {
		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#116: entro al if");

		var file = nlapiLoadFile(idTemplate); //load the HTML file
		//var file = nlapiLoadFile(76987); //load the HTML file  --> Jhosep Cambio ID HTML

		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#121: paso el loadfile");

		//nlapiLogExecution("DEBUG", "imprimirFactura_suitelet","rep:"+request.getParameter("tipoRep"));

		var template = file.getValue(); //get the contents

		//Header de PDF
		//Las url tiene &, se debe limpiar esos caracteres por el &amp (Ultimo replace)
		template = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">" + template;

		renderer.setTemplate(template);

		renderer.addSearchResults("resultsFacturas", facturasPagas);
		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#168: facturasPagas:" + JSON.stringify(facturasPagas));
		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#169: facturasPagas.length:" + facturasPagas.length);
		var facturasPagasStr = "";
		var facturapagaAnt = "";
		for (var i = 0; i < facturasPagas.length; i++) {
			actual = facturasPagas[i];
			nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#170: facturasPagas.tranid:" + actual.getValue(columns[2]));
			nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#172: facturasPaga:" + JSON.stringify(actual));
			if (actual.getValue(columns[2]) != facturapagaAnt) {
				facturasPagasStr = facturasPagasStr + actual.getValue(columns[2]);
				if (i < facturasPagas.length - 1)
					facturasPagasStr = facturasPagasStr + ",";
				facturapagaAnt = actual.getValue(columns[2]);
			}

		}

		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#171: pdfFileName: " + recPagoProveedor.getFieldValue("entityname") + "-" + facturasPagasStr);
		pdfFileName = recPagoProveedor.getFieldValue("entityname") + "-" + facturasPagasStr + "-" + request.getParameter("idPago") + ".pdf";

		if (pdfFileName.length > 199)
			pdfFileName = pdfFileName.substring(195, 0) + ".pdf";

		if (!isEmpty(retenciones))
			renderer.addSearchResults("resultsRetenciones", retenciones);

		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#177: retenciones:" + retenciones);

		if (!isEmpty(recSubsidiary))
			renderer.addRecord("recSubsidiary", recSubsidiary);
		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#179: recSubsidiary:" + JSON.stringify(recSubsidiary));

		if (!isEmpty(recLogo))
			renderer.addSearchResults("recLogo", recLogo);
		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#180: recLogo:" + JSON.stringify(recLogo));

		var accountID = recPagoProveedor.getFieldValue("custbody_l54_cuenta_banco") ? recPagoProveedor.getFieldValue("custbody_l54_cuenta_banco") : recPagoProveedor.getFieldValue("account");
		recPagoProveedor.setFieldValue("account", accountID) 

		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#181: antes de addRecord");
		renderer.addRecord("infoPago", recPagoProveedor);

		var recPagoProveedor = nlapiLoadRecord(tipoRecord, request.getParameter("idPago"));

		if (!isEmpty(datosImpositivos))
			renderer.addSearchResults("datosImpositivos", datosImpositivos);

		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#180: datosImpositivos:" + JSON.stringify(datosImpositivos));

		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#184: antes de renderer");

		var xml = renderer.renderToString();

		try {
			/**
			 * Si se renderiza apply y credit de esta forma, se obtienen correctamente la cantidad de facturas
			 * que se utilizaron y creditos, con record.load esto no funciona, y la cantidad es menor
			 * por eso se renderizar estas tablas de esta forma, y luego se inyectan al xml
			 */
			nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "antes de renderizar imprimir pago");
			var miArchivoBraian = nlapiPrintRecord("TRANSACTION", request.getParameter("idPago"), "HTML", null);
			nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "despues de renderizar imprimir pago");
			// var rtaMiArchivoBraian = base64Decode(miArchivoBraian.getValue());
			var rtaMiArchivoBraian = miArchivoBraian.getValue();


			var startTag = "<main>";
			var endTag = "</main>";

			var startIndex = rtaMiArchivoBraian.indexOf(startTag);
			var endIndex = rtaMiArchivoBraian.indexOf(endTag);

			if (startIndex !== -1 && endIndex !== -1) {
				startIndex += startTag.length;
				var contenidoExtraido = rtaMiArchivoBraian.substring(startIndex, endIndex);
				nlapiLogExecution("AUDIT", "imprimirPago_suitelet contenido extraido", contenidoExtraido);

				var inicioTagXml = xml.indexOf(startTag);
				var finTagXml = xml.indexOf(endTag);

				if (inicioTagXml !== -1 && finTagXml !== -1) {
					finTagXml += endTag.length;
					xml = xml.substring(0, inicioTagXml) + startTag + contenidoExtraido + endTag + xml.substring(finTagXml);
				}
			}

			// var regexFindMainContent = /<main>([\s\S]*?)<\/main>/i;
			// var contenidoExtraido = rtaMiArchivoBraian.match(regexFindMainContent);
			// contenidoExtraido = contenidoExtraido[1];
			// nlapiLogExecution("AUDIT", "imprimirPago_suitelet contenido extraido", contenidoExtraido);
			// xml = xml.replace(regexFindMainContent, "<main>" + contenidoExtraido + "</main>");
			// var batchSize = 3000;
			// for (var i = 0; i < xml.length; i += batchSize) {
			// 	var partial = xml.substring(i, i + batchSize);
			// 	nlapiLogExecution("AUDIT", "imprimirPago_suitelet #80: xml i=" + i, partial);
			// }

		} catch (error) {
			nlapiLogExecution("ERROR", "imprimirPago_suitelet renderizar tablas apply y credit", JSON.stringify(error));
		}

		// var batchSize = 3000;
		// for (var i = 0; i < xml.length; i += batchSize) {
		// 	var batch = xml.substring(i, i + batchSize);
		// 	nlapiLogExecution("AUDIT", "imprimirPago_suitelet #189: xml: (iteracion=" + i + ")", batch);
		// }

		var renderPDF = nlapiXMLToPDF(xml);

		nlapiLogExecution("AUDIT", "imprimirPago_suitelet", "#190: Luego de xmlToPDF");

		nlapiLogExecution("DEBUG", "imprimirPago_suitelet", "FIN - Guardar PDF : " + guardarPDF + " ID Carpeta : " + carpetaGuardarPago);

		if (impresionMasiva == "SI") {
			try {

				var archAdj = nlapiCreateFile(pdfFileName, "PDF", renderPDF.getValue());
				archAdj.setFolder(carpetaGuardarPago);

				var idFile = nlapiSubmitFile(archAdj);
				return "Archivo guardado";
			}
			catch (exception) {
				nlapiLogExecution("ERROR", "Error grabando PDF de Pago A Proveedor", "NetSuite error: " + exception.message);
				var error = "Error: " + exception.message;
				return error;
			}
		}

		if (enviarPagoyRetencion == "SI") {
			try {

				var archAdj = nlapiCreateFile(pdfFileName, "PDF", renderPDF.getValue());
				archAdj.setFolder(carpetaGuardarPago);

				var idFile = nlapiSubmitFile(archAdj);
				nlapiLogExecution("DEBUG", "enviarPagoyRetencion", "carpetaGuardarPago: " + carpetaGuardarPago + ", idFile: " + idFile);
				if (!isEmpty(idFile)) {
					if (recPagoProveedor.getFieldValue("custbody_l54_pdf_retenciones_generado") != "T") {
						recPagoProveedor.setFieldValue("custbody_l54_pdf_pago_y_reten", idFile);
						recPagoProveedor.setFieldValue("custbody_l54_pdf_retenciones_generado", "T");
					}
					else
						recPagoProveedor.setFieldValue("custbody_pdf_retenciones_enviado", "T");
					try {
						var idTmp = nlapiSubmitRecord(recPagoProveedor, true);
					} catch (e) {
						nlapiLogExecution("ERROR", "Error grabando PDF de Pago A Proveedor", "NetSuite error: " + e.message);
						return "Error ver log";
					}
				}
				return "Archivo guardado";
			}
			catch (exception) {
				nlapiLogExecution("ERROR", "Error grabando PDF de Pago A Proveedor", "NetSuite error: " + exception.message);
				var error = "Error: " + exception.message;
				return error;
			}
		}
		if (guardarPDF == true) {
			nlapiLogExecution("DEBUG", "guardarPagoyRetenciones_guardarPDF", "entro guardarPDF");
			if (!isEmpty(carpetaGuardarPago)) {
				var archAdj = nlapiCreateFile(pdfFileName, "PDF", renderPDF.getValue());
				archAdj.setFolder(carpetaGuardarPago);

				var idFile = nlapiSubmitFile(archAdj);
				if (!isEmpty(idFile)) {
					campoPDFPagoYRet = request.getParameter("campoPDFPagoYRet");
					nlapiLogExecution("DEBUG", "guardarPagoyRetenciones_guardarPDF", "carpetaGuardarPago: " + carpetaGuardarPago + ", idFile: " + idFile + ", campoPDFPagoYRet: " + campoPDFPagoYRet);
					if (!isEmpty(campoPDFPagoYRet))
						recPagoProveedor.setFieldValue(campoPDFPagoYRet, idFile);
					else
						recPagoProveedor.setFieldValue(campoPDF, idFile);
					try {
						var idTmp = nlapiSubmitRecord(recPagoProveedor, true);
						if (request.getParameter("esperarespuesta") !== "SI")
							return "OK";
					}
					catch (e) {
						nlapiLogExecution("ERROR", "Error grabando PDF de Pago A Proveedor", "NetSuite error: " + e.message);
					}
				}
			}
		}

		response.setContentType("PDF", pdfFileName);
		response.write(renderPDF.getValue());



	} else {
		nlapiLogExecution("ERROR", "imprimirPago_suitelet", "Error Obteniendo ID del Template de Impresion de Pago A Proveedores");
	}

}

function imprimirPago_workflow() {

	nlapiLogExecution("AUDIT", "imprimirPago_workflow", "INICIO-record type:" + nlapiGetRecordType());
	var new_url = nlapiResolveURL("SUITELET", "customscriptl54_imp_pago_y_reten_sl", "customdeploy_l54_imp_pago_y_rete_sl");
	var params = new Array();

	// Verifico Si es OneWorld
	var oneWorld = false;
	if (esOneworld()) {
		oneWorld = true;
	}

	//PC-1 - FIX 2017.1 - Se hace un uppercase
	if (nlapiGetRecordType().toUpperCase() == "VENDORPAYMENT") {
		nlapiLogExecution("AUDIT", "imprimirPago_workflow", "#192-Estoy en vendorpayment");

		params["idPago"] = nlapiGetRecordId();
		params["tipoPago"] = "VENDORPAYMENT";
		params["numero"] = nlapiLookupField("vendorpayment", nlapiGetRecordId(), "transactionnumber");
		if (oneWorld == true) {
			params["subsidiaria"] = nlapiLookupField("vendorpayment", nlapiGetRecordId(), "subsidiary");
		} else {
			params["subsidiaria"] = "";
		}

		params["guardarPago"] = "SI";
		params["campoPDFPagoYRet"] = "custbody_l54_pdf_pago_y_reten";

	} else {
		nlapiLogExecution("AUDIT", "imprimirPago_workflow", "#235-NO Estoy en vendorpayment. Es OP");

		params["idPago"] = nlapiGetRecordId();
		params["tipoPago"] = "ORDPAGO";
		params["numero"] = nlapiLookupField("customrecord_l54_orden_pago", nlapiGetRecordId(), "name");
		if (oneWorld == true) {
			params["subsidiaria"] = nlapiLookupField("customrecord_l54_orden_pago", nlapiGetRecordId(), "custrecord_l54_orden_pago_subsidiaria");
		} else {
			params["subsidiaria"] = "";
		}
		params["guardarPago"] = "SI";
	}

	params["esperarespuesta"] = "SI";
	nlapiLogExecution("DEBUG", "imprimirPagoyRetenciones_workflow", "restoParams:" + params);

	nlapiLogExecution("DEBUG", "imprimirPagoyRetenciones_workflow", "id:" + params["idPago"] + "," + nlapiGetRecordType() + ", restoParams:" + JSON.stringify(params));

	nlapiSetRedirectURL("SUITELET", "customscriptl54_imp_pago_y_reten_sl", "customdeploy_l54_imp_pago_y_rete_sl", false, params);

	nlapiLogExecution("DEBUG", "imprimirPago_workflow", "FIN");
}


function imprimirPagoyRetenciones_workflow() {

	nlapiLogExecution("AUDIT", "imprimirPagoyRetenciones_workflow", "INICIO-record type:" + nlapiGetRecordType());
	var new_url = nlapiResolveURL("SUITELET", "customscriptl54_imp_pago_y_reten_sl", "customdeploy_l54_imp_pago_y_rete_sl", true);
	var params = new Array();

	// Verifico Si es OneWorld
	var oneWorld = false;
	if (esOneworld()) {
		oneWorld = true;
	}


	nlapiLogExecution("AUDIT", "imprimirPagoyRetenciones_workflow", "#192-Estoy en vendorpayment");

	params["idPago"] = nlapiGetRecordId();
	params["tipoPago"] = "VENDORPAYMENT";
	params["numero"] = nlapiLookupField("vendorpayment", nlapiGetRecordId(), "transactionnumber");
	if (oneWorld == true) {
		params["subsidiaria"] = nlapiLookupField("vendorpayment", nlapiGetRecordId(), "subsidiary");
	} else {
		params["subsidiaria"] = "";
	}

	params["enviarPagoyRetencion"] = "SI";

	try {
		nlapiLogExecution("DEBUG", "imprimirPagoyRetenciones_workflow", "id:" + params["idPago"] + "," + nlapiGetRecordType() + ", restoParams:" + JSON.stringify(params));
		var objRta = nlapiRequestURL(new_url, params, null);
		nlapiLogExecution("DEBUG", "imprimirPagoyRetenciones_workflow", "FIN");
		return "Ok";
	}
	catch (ex) {
		nlapiLogExecution("ERROR", "imprimirPagoyRetenciones_workflow", "ERROR: " + ex.message);
	}
}

function esOneworld() {
	var filters = [new nlobjSearchFilter("isinactive", null, "is", "F"),
	new nlobjSearchFilter("custrecord_l54_es_oneworld", null, "is", "T")];

	var searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, filters, null);

	if (searchresults != null && searchresults.length > 0)
		return true;
	else
		return false;
}

function isEmpty(value) {
	return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
}

function nullInBlank(value) {

	if (value == null || value == undefined)
		return "";

	return value;
}

function facturas(item, index) {
	nlapiLogExecution("DEBUG", "facturas", item + "|");
}

function guardarPagoyRetenciones(type) {

	nlapiLogExecution("AUDIT", "guardarPagoyRetenciones", "INICIO-record type:" + type);

	if (type == "create" || type == "paybills") {
		nlapiLogExecution("AUDIT", "guardarPagoyRetenciones", "INICIO-record type:" + nlapiGetRecordType());
		var new_url = nlapiResolveURL("SUITELET", "customscriptl54_imp_pago_y_reten_sl", "customdeploy_l54_imp_pago_y_rete_sl", true);
		var params = new Array();

		// Verifico Si es OneWorld
		var oneWorld = false;
		if (esOneworld()) {
			oneWorld = true;
		}


		nlapiLogExecution("AUDIT", "guardarPagoyRetenciones", "#192-Estoy en vendorpayment");

		params["idPago"] = nlapiGetRecordId();
		params["tipoPago"] = "VENDORPAYMENT";
		params["numero"] = nlapiLookupField("vendorpayment", nlapiGetRecordId(), "transactionnumber");
		if (oneWorld == true) {
			params["subsidiaria"] = nlapiLookupField("vendorpayment", nlapiGetRecordId(), "subsidiary");
		} else {
			params["subsidiaria"] = "";
		}
		params["guardarPago"] = "SI";
		params["campoPDFPagoYRet"] = "custbody_l54_pdf_pago_y_reten";


		try {
			nlapiLogExecution("DEBUG", "guardarPagoyRetenciones", "id:" + params["idPago"] + "," + nlapiGetRecordType() + ", restoParams:" + JSON.stringify(params));
			var objRta = nlapiRequestURL(new_url, params, null);
			nlapiLogExecution("DEBUG", "guardarPagoyRetenciones", "FIN");
			return "Ok";
		}
		catch (ex) {
			nlapiLogExecution("ERROR", "guardarPagoyRetenciones", "ERROR: " + ex.message);
		}
	}

}