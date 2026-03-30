/*
3KSYS - PERCEPCIONES EN VENTAS - CLIENTE
VERSION 1.0 - 2015
DESARROLLADO POR 3KSYS
 */
/*
Modificaciones:
==============
06/12/2015 - FDS1: Cambio para que el calcular percepciones ignore las lineas que tienen percepcion 0
12/09/2017: Cambio para excluir de las percepciones a las facturas letra E
13/09/2017: Cambio para excluir de las percepciones a los contribuyentes que no tengan tildado el campo Calcula Percepcion
12/04/2019: Jsalazar: Se agregó la validación de no calcular PV a notas de créditos parciales.
 */
function isEmpty(value) {
	return value === '' || value === null || value === undefined || value === 'null' || value === 'undefined';
}

Number.prototype.toFixedOK = function(decimals) {
    var sign = this >= 0 ? 1 : -1;
    return (Math.round((this*Math.pow(10,decimals))+(sign*0.001))/Math.pow(10,decimals)).toFixed(decimals);
}

function esOneworld() {
	var filters = [new nlobjSearchFilter('isinactive', null, 'is', 'F'),
		new nlobjSearchFilter('custrecord_l54_es_oneworld', null, 'is', 'T')];

	var searchresults = new nlapiSearchRecord("customrecord_l54_datos_impositivos_emp", null, filters, null);

	if (searchresults != null && searchresults.length > 0)
		return true;
	else
		return false;
}

function getInfoTransReferencia2(transaccion_referencia){
	nlapiLogExecution('DEBUG', 'getInfoTransReferencia', '222transaccion_referencia: ' + transaccion_referencia);
	var filtroTransReferencia = new Array();
	filtroTransReferencia[0] = new nlobjSearchFilter('internalid', null, 'is', transaccion_referencia);

	var search = new nlapiLoadSearch('transaction', 'customsearch_l54_imp_transaccion_ref');
	search.addFilters(filtroTransReferencia);
	var searchResults = search.runSearch();

	var resultadoTransRef;

	// resultIndex points to record starting current "resultado" in the entire results array
	var resultIndex = 0;
	var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
	var resultado; // temporary variable used to store the result set
	do {
		// fetch one result set
		resultado = searchResults.getResults(resultIndex, resultIndex + resultStep);
		if (!isEmpty(resultado) && resultado.length > 0) {
			if (resultIndex == 0)
				resultadoTransRef = resultado; //Primera ve inicializa
			else
				resultadoTransRef = resultadoTransRef.concat(resultado);
		}

		// increase pointer
		resultIndex = resultIndex + resultStep;

		// once no records are returned we already got all of them
	} while (!isEmpty(resultado) && resultado.length > 0)

	nlapiLogExecution('DEBUG', 'getInfoTransReferencia', 'resultadoTransRef: ' + JSON.stringify(resultadoTransRef));
	return resultadoTransRef;
}

function calcular_percepcion_ventas() {

	try {
		nlapiLogExecution('DEBUG','calcular_percepciones_ventas','INICIO DEL CÁLCULO DE PERCEPCIONES MANUAL');
		var letraDocumento = nlapiGetFieldText('custbody_l54_letra');
		//INICIO - Proceso determinar si se debe calcular percepciones al cliente
		var idclienteTransaccion = nlapiGetFieldValue('entity');

		nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas', 'idclienteTransaccion: ' + idclienteTransaccion);
		var errorCargarCliente = false;

		try {
			//var regCliente = nlapiLoadRecord('customer', idclienteTransaccion);
            var regCliente = nlapiLookupField('customer', idclienteTransaccion, 'custentity_l54_tipo_contribuyente_iibb');
            var entityType = 'customer'; 
            nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas', 'Es Cliente');
		} catch (errorCliente) {
			errorCargarCliente = true;
			nlapiLogExecution('ERROR', 'calcular_percepciones_ventas', 'Error al intentar cargar Cliente - errorCliente:' + errorCliente.message);
		}

		if (errorCargarCliente) {
			try {
				//var regCliente = nlapiLoadRecord('job', idclienteTransaccion);
                var regCliente = nlapiLookupField('job', idclienteTransaccion, 'custentity_l54_tipo_contribuyente_iibb');
                var entityType = 'job'; 
                nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas', 'Es Proyecto');
			} catch (errorJob) {
				nlapiLogExecution('ERROR', 'calcular_percepciones_ventas', 'Error al intentar cargar Proyecto - errorJob:' + errorJob.message);
			}
		}

		//var idTipoContribIIBB = regCliente.getFieldValue('custentity_l54_tipo_contribuyente_iibb');
	    var idTipoContribIIBB = regCliente;
        var calcularPercepcionesAux = 'T';
		var difPermitida = 0.05;
		var totalRestaImportes = 0.00;
		var excepcionIVA = convertToBoolean(nlapiLookupField(entityType, idclienteTransaccion, 'custentity_l54_exencion_per_iva'));	
		var caducoExepcion;
		var fechaCaducExcepIVA = nlapiLookupField(entityType, idclienteTransaccion, 'custentity_l54_exencion_fec_cad');
		var fechaActual = nlapiGetFieldValue('trandate');
		if(!isEmpty(fechaCaducExcepIVA)){
			if(fechaActual < fechaCaducExcepIVA){
				caducoExepcion = false;
				//alert('Aun no caduca la Exepcion');
			} else if(fechaActual > fechaCaducExcepIVA){
				caducoExepcion = true;
				//alert('La Exepcion Caduco');
			} else{
				caducoExepcion = false;
				//alert('La fecha es igual');
			}
		}
		

		if (isEmpty(idTipoContribIIBB) && ((excepcionIVA && isEmpty(fechaCaducExcepIVA)) || (excepcionIVA && !caducoExepcion))) {
            alert("No se puede continuar el proceso de cálculo de percepciones de IIBB porque no tiene configurado Tipo Contribuyente IIBB en el registro del cliente. Por favor, verifique/edite el registro y vuelva a intentar.");
            alert("No se puede continuar el proceso de cálculo de percepciones de IVA porque la configuración de inscripción de IVA en el cliente no lo permite. Por favor, verifique/edite el registro y vuelva a intentar.");

		} else {
			
			var llevaPercepcion = 'F';
			var nameTipoContribIIBB = null;

			if (!isEmpty(idTipoContribIIBB)) {
				var regTipoContribIIBB = nlapiLoadRecord('customrecord_l54_tipo_contribuyente_iibb',idTipoContribIIBB);
				nameTipoContribIIBB = regTipoContribIIBB.getFieldValue('name');
				llevaPercepcion = regTipoContribIIBB.getFieldValue('custrecord_l54_calcula_percepcion');
			}

			if(llevaPercepcion=='F' && !isEmpty(idTipoContribIIBB) && ((excepcionIVA && isEmpty(fechaCaducExcepIVA)) || (excepcionIVA && !caducoExepcion)))
			{
            
              alert("No se calcula percepción IIBB debido a que el Cliente Pertenece al Tipo de Contribuyente : " + nameTipoContribIIBB + ", el cual está configurado para que no calcule percepciones.");
              alert("No se puede continuar el proceso de cálculo de percepciones de IVA porque la configuración de inscripción de IVA en el cliente no lo permite. Por favor, verifique/edite el registro y vuelva a intentar.");
			}//FIN - Proceso determinar si se debe calcular percepciones al cliente
			else {
				if(letraDocumento === "E") {
					alert('Las facturas de letra E no tienen percepciones.');
				}
				else {
					if (confirm('El proceso de cálculo de percepciones en ventas puede demorar unos segundos, desea continuar ?')) {
						if (isEmpty(idTipoContribIIBB)) {
							alert("No se puede realizará el proceso de cálculo de percepciones de IIBB porque no tiene configurado Tipo Contribuyente IIBB en el registro del cliente. Por favor, verifique/edite el registro y vuelva a intentar.");
						}
						// elimino las líneas de percepciones ventas que estaban generadas en esta transacción
						//var numberOfItems = nlapiGetLineItemCount('item');
						var total = parseFloat(nlapiGetFieldValue('total'),10);
						var total_aux = total;
						var totalDiscount = 0;
						for (var r = 1; r <= nlapiGetLineItemCount("item"); r++) {
							if (nlapiGetLineItemValue('item', 'itemtype', r) == 'Discount') {
								totalDiscount += Math.abs(parseFloat(nlapiGetLineItemValue('item', 'amount', r), 10));
							}

							if (nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', r) == 'T' || nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', r) == 'T' || nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', r) == true || nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', r) == true) {
								if (nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', r) != 'T') {
									//Se restan las percepciones al total de la factura para sacar el total sin percepciones
									total -= parseFloat(nlapiGetLineItemValue('item', 'tax1amt', r),10);
								}
								total_aux -= parseFloat(nlapiGetLineItemValue('item', 'tax1amt', r),10);
								nlapiSelectLineItem("item", r);
								nlapiRemoveLineItem("item");
								r--;
							}
						}


						/* INICIO - SE ELIMINAN LOS IMPORTES ACUMULADOS DEL PAGO ACTUAL */

						var cantidadAcumulados = nlapiGetLineItemCount("recmachcustrecord_l54_acum_perc_trans_asoc");
						nlapiLogExecution('DEBUG', 'calcularPercepciones', 'LINE 194 - CANTIDAD ACUMULADOS: ' + cantidadAcumulados);

						for (var j = 1; j <= nlapiGetLineItemCount("recmachcustrecord_l54_acum_perc_trans_asoc"); j++) {
							nlapiSelectLineItem("recmachcustrecord_l54_acum_perc_trans_asoc", j);
							nlapiRemoveLineItem("recmachcustrecord_l54_acum_perc_trans_asoc");
							j--;
						}

						/* FIN - SE ELIMINAN LOS IMPORTES ACUMULADOS DEL PAGO ACTUAL */


						var tipoCambio = parseFloat(nlapiGetFieldValue('exchangerate'),10);
						var total_moneda_local = parseFloat(parseFloat(total,10) * parseFloat(tipoCambio,10), 10);//Valor del total sin percepciones en moneda local
						//var total_moneda_local = parseFloat((total*tipoCambio), 10).toFixed(2);
						nlapiLogExecution('DEBUG','calcular_percepciones_ventas','TipoCambio Transaccion: '+tipoCambio+' - Total Transaccion (Sin Percepciones): '+total_aux+' - Total Transaccion Monena Local (Sin Percepciones): '+total_moneda_local+' - Total Transaccion Monena Local (Sin Percepciones).toFixed(2): '+(total_moneda_local).toFixed(2)+' - TipoTransaccion: '+nlapiGetRecordType()+' - calcularPercepcionesAux: '+calcularPercepcionesAux + ' - Discount: ' + totalDiscount);
	
						// Verificación de cálculo de percepciones para NC parciales.
						// esta validación se maneja en el script "L54 - Validar Percepciones para NC (UE).js"		

						
						// Obtengo informacion de la Transaccion

						//var clienteTransaccion = nlapiGetFieldValue('entity');
						//var total = nlapiGetFieldValue('total');
						var subTotal = nlapiGetFieldValue('subtotal');
						var discounttotal = nlapiGetFieldValue("discounttotal");
						var tipoCambio = nlapiGetFieldValue('exchangerate');
						var subsidiariaTransacicon = null;
						var esOneWorld = esOneworld();
						var costoEnvio = nlapiGetFieldValue('shippingcost');
						var tipoContribuyente = nlapiGetFieldValue('custbody_l54_tipo_contribuyente');
						if(isEmpty(costoEnvio)){
							costoEnvio=0;
						}
						var subsidiariaTransaciconText = "";
						if (esOneWorld) {
							subsidiariaTransacicon = nlapiGetFieldValue('subsidiary');
							subsidiariaTransaciconText = nlapiGetFieldText('subsidiary');
						}

						// Inicio Llamar a SuiteLet para el Calculo de las Percepciones en VENTAS
						var informacionTransaccion = new Object();
						var trandate = nlapiGetFieldValue('trandate');
						var periodo = nlapiGetFieldValue('postingperiod');
						nlapiLogExecution('AUDIT', 'calcular_percepciones_ventas', 'Trandate: ' + trandate + ' / periodo: ' + periodo);
						informacionTransaccion.periodo = periodo;
						informacionTransaccion.trandate = nlapiStringToDate(trandate);
						nlapiLogExecution('AUDIT', 'calcular_percepciones_ventas', 'nlapiStringToDate Trandate: ' + informacionTransaccion.trandate);
						informacionTransaccion.cliente = idclienteTransaccion;
						informacionTransaccion.total = total_aux.toFixedOK(2);
						informacionTransaccion.subTotal = subTotal;
						informacionTransaccion.discounttotal = discounttotal;
						informacionTransaccion.tipoCambio = tipoCambio;
						informacionTransaccion.subsidiaria = subsidiariaTransacicon;
						informacionTransaccion.subsidiariaText = subsidiariaTransaciconText;
						informacionTransaccion.esOneWorld = esOneWorld;
						informacionTransaccion.costoEnvio = costoEnvio;
						informacionTransaccion.idTransaccion = nlapiGetRecordId();
						nlapiLogExecution('DEBUG','calcular_percepciones_ventas', 'LINE 199 - llevaPercepcion:  '+llevaPercepcion+' - calcularPercepcionesAux: '+calcularPercepcionesAux);
                        var coeficienteBaseImponible = nlapiGetFieldValue('custbody_l54_coeficiente_base_imp');
						informacionTransaccion.coeficienteBaseImponible = (isEmpty(coeficienteBaseImponible)) ? 1.00 : coeficienteBaseImponible;
						informacionTransaccion.tipoContribuyente = tipoContribuyente;
						informacionTransaccion.totalDiscount = totalDiscount;
						informacionTransaccion.articulos = new Array();
						
						// INICIO Informacion Para Impuestos Internos
						informacionTransaccion.informacionImpInterno=new Object();
						informacionTransaccion.informacionImpInterno.calcularImp=false;
						informacionTransaccion.informacionImpInterno.montoImpInterno=parseFloat(0,10);
						informacionTransaccion.informacionImpInterno.baseCalculo = parseFloat(0,10);
						informacionTransaccion.informacion_articulos_iva = new Array();
						// FIN Informacion Para Impuestos Internos
							
						// INICIO NUEVO enviar informacion de si se debe calcular las percepciones o no
						informacionTransaccion.calcularPercepciones = false;
						informacionTransaccion.calcularPercepcionesIVA = false;
						//((excepcionIVA && !isEmpty(fechaCaducExcepIVA)) || (excepcionIVA && caducoExepcion))
						if ((letraDocumento!='E' && llevaPercepcion == 'T')){
							// se entra por validacion de ingresos brutos
							informacionTransaccion.calcularPercepciones = true;
						}

						if (excepcionIVA == false || (excepcionIVA && caducoExepcion)) {
							informacionTransaccion.calcularPercepcionesIVA = true;
						}
						// FIN NUEVO enviar informacion de si se debe calcular las percepciones o no

						// Inicio Obtener Informacion de los Articulos
						var contadorArticulos = 0;

						var numberOfItems = nlapiGetLineItemCount('item');
						nlapiLogExecution('DEBUG','calcular_percepciones_ventas','LINE 231 numberOfItems: '+numberOfItems);

						for (var i = 1; numberOfItems != null && i <= numberOfItems; i++) {

							var item = nlapiGetLineItemValue('item', 'item', i);
							var cantidad = nlapiGetLineItemValue('item', 'quantity', i);
							var itemImporte = nlapiGetLineItemValue('item', 'amount', i);
							var itemBienDeUso = nlapiGetLineItemValue('item', 'custcol_l54_pv_bien_de_uso', i);
							if(!isEmpty(itemBienDeUso) && itemBienDeUso=='T'){
								itemBienDeUso=true;
							}
							else{
								itemBienDeUso=false;
							}
								
							var tipoItem = nlapiGetLineItemValue('item', 'itemtype', i);
								
							var otrosTributos = nlapiGetLineItemValue('item', 'custcol_l54_otros_tributos', i);
							if(!isEmpty(otrosTributos) && otrosTributos=='T'){
								otrosTributos=true;
							}
							else{
								otrosTributos=false;
							}
							var impuestoInterno = nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', i);
							if(!isEmpty(impuestoInterno) && impuestoInterno=='T'){
								impuestoInterno=true;
							}
							else{
								impuestoInterno=false;
							}
							var esPercepcion = nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', i);
							if(!isEmpty(esPercepcion) && esPercepcion=='T'){
								esPercepcion=true;
							}
							else{
								esPercepcion=false;
							}
							var tipoProducto = nlapiGetLineItemValue('item', 'custcol_l54_tipo_producto', i);
							var codigoImpuesto = nlapiGetLineItemValue('item', 'taxcode', i);
							var importeImpuestoIVA = nlapiGetLineItemValue('item', 'tax1amt', i);
							var importeBrutoItem = nlapiGetLineItemValue('item', 'grossamt', i);
							
							/*var subTotal = nlapiGetFieldValue('subtotal');
							var descuentoTotal = nlapiGetFieldValue('discounttotal');
							if(isEmpty(descuentoTotal)){
								descuentoTotal='';
							}
							
							var factorDescuento=1;
							if(descuentoTotal!=null && !isEmpty(descuentoTotal) && !isNaN(descuentoTotal) && parseFloat(descuentoTotal,10)<0){
								factorDescuento=parseFloat((parseFloat(1,10)-(parseFloat(Math.abs(descuentoTotal),10)/parseFloat(Math.abs(subTotal)))),10);
							}*/
							// Preguntar por Cantidad > 0 para no incluir Articulos de Descripcion,Subtotal,etc
							// Los Items de Descuento tenerlos en Cuenta

							if (itemBienDeUso==false && !isEmpty(itemImporte) && (tipoItem=='Discount' || (!isEmpty(cantidad) && cantidad > 0)) && otrosTributos==false && impuestoInterno==false && esPercepcion==false) {

								if (tipoItem != 'Discount' && tipoItem != 'Description' && tipoItem != 'Subtotal') {
									informacionTransaccion.articulos[contadorArticulos] = new Object();
									informacionTransaccion.articulos[contadorArticulos] = obtenerDatosLineas(item, itemImporte, importeBrutoItem, i);
								} else if (tipoItem == 'Discount') {
									informacionTransaccion.articulos[contadorArticulos - 1].importeBrutoLinea += parseFloat(importeBrutoItem, 10);
									informacionTransaccion.articulos[contadorArticulos - 1].importeNetoLinea += parseFloat(itemImporte, 10);
								}

								contadorArticulos = parseInt(contadorArticulos, 10) + parseInt(1, 10);
								
								// INICIO Enviar Información Para CAclular Impuesto Interno
								if (tipoItem != 'Discount'){
									var porcentajeImpuestoInterno=nlapiGetLineItemValue('item', 'custcol_3k_porc_imp_interno', i);
									if(!isEmpty(porcentajeImpuestoInterno) && !isNaN(parseFloat(porcentajeImpuestoInterno,10)) && parseFloat(porcentajeImpuestoInterno,10)>0){
										informacionTransaccion.informacionImpInterno.calcularImp=true;
										informacionTransaccion.informacionImpInterno.baseCalculo = parseFloat(informacionTransaccion.informacionImpInterno.baseCalculo,10) + parseFloat(itemImporte,10);
										informacionTransaccion.informacionImpInterno.montoImpInterno=parseFloat(informacionTransaccion.informacionImpInterno.montoImpInterno,10) + parseFloat((parseFloat(porcentajeImpuestoInterno,10)*parseFloat(itemImporte,10)/100),10);
									}
									if(excepcionIVA == false || (excepcionIVA && caducoExepcion)){
										var objectIVA= new Object();
										objectIVA.tipoProducto = tipoProducto;
										objectIVA.tipoIVA = codigoImpuesto;
										objectIVA.baseNetaImponible = parseFloat(itemImporte,10);
										objectIVA.baseImporteBruto = parseFloat(importeBrutoItem,10);
										objectIVA.baseImporteIVA = parseFloat(importeImpuestoIVA,10);
										
										var index = informacionTransaccion.informacion_articulos_iva.findIndex(function(obj){
											return obj.tipoProducto == tipoProducto && obj.tipoIVA == codigoImpuesto;
										});
										if(index>=0){
											informacionTransaccion.informacion_articulos_iva[index].baseNetaImponible = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseNetaImponible,10) + parseFloat(itemImporte,10)
											informacionTransaccion.informacion_articulos_iva[index].baseImporteBruto = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseImporteBruto,10) + parseFloat(importeBrutoItem,10)
											informacionTransaccion.informacion_articulos_iva[index].baseImporteIVA = parseFloat(informacionTransaccion.informacion_articulos_iva[index].baseImporteIVA,10) + parseFloat(importeImpuestoIVA,10)
										}else{
											informacionTransaccion.informacion_articulos_iva.push(objectIVA);
										}
									}
								}
								// FIN Enviar Información Para CAclular Impuesto Interno
							}

						}
						// Fin Obtener Informacion de los Articulos

						//17/05/2019: SE CONDICIONA QUE EL LLAMADO AL SUITELET SEA SOLO DESDE LAS TRANSACCIONES A LAS CUALES APLICA EL CALCULO DE PERCEPCIONES
						var recTypeCalculo = nlapiGetRecordType();

						//if (informacionTransaccion.informacionImpInterno.calcularImp==true || informacionTransaccion.calcularPercepciones == true) {
							informacionTransaccion.recTypeCalculo = recTypeCalculo;
							if (!isEmpty(nlapiGetRecordId()))
								informacionTransaccion.recIdCalculo   = nlapiGetRecordId();

							informacionTransaccion.scriptOrigen = 'clientScript';

							if (!isEmpty(numberOfItems) && numberOfItems > 0 && !isEmpty(contadorArticulos) && contadorArticulos > 0) {

								var objInformacionTransaccion = new Array();

								var informacionTransaccionJson = JSON.stringify(informacionTransaccion);
								objInformacionTransaccion['informacionTransaccion'] = informacionTransaccionJson;
								if (informacionTransaccion.calcularPercepciones == true){
									try {
										nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas', 'INICIO llamada SuiteLet');
										nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas', 'Parametros Suitelet: '+informacionTransaccionJson);
										var strURL = nlapiResolveURL('SUITELET', 'customscript_l54_cal_percepciones_ventas', 'customdeploy_l54_cal_percepciones_ventas');
										var objRta = nlapiRequestURL(strURL, objInformacionTransaccion, null, callBackPercepciones, null);
										
										nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas', 'FIN llamada SuiteLet');
									} catch (err) {
										nlapiLogExecution('ERROR', 'calcular_percepciones_ventas', 'LINE 329 - Error Calculando Percepiones en Ventas - NetSuite error: ' + err.message);
										return true;
									}
									
								}
								
								if(informacionTransaccion.calcularPercepcionesIVA == true){
									alert('Se inicia el proceso de calculo de Percepciones IVA espere un momento');
									try {
										nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas_IVA', 'INICIO llamada SuiteLet IVA');
										nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas_IVA', 'Parametros Suitelet: '+informacionTransaccionJson);
										var strURLIVA = nlapiResolveURL('SUITELET', 'customscript_l54_cal_percep_ventas_iva', 'customdeploy_l54_cal_percep_ventas_iva');
										var objRtaIVA = nlapiRequestURL(strURLIVA, objInformacionTransaccion, null, callBackPercepcionesIVA, null);
										
										nlapiLogExecution('DEBUG', 'calcular_percepciones_ventas', 'FIN llamada SuiteLet');
									} catch (err) {
										nlapiLogExecution('ERROR', 'calcular_percepciones_ventas', 'LINE 329 - Error Calculando Percepiones en Ventas - NetSuite error: ' + err.message);
										return true;
									}
								}
								// Fin Llamar a SuiteLet para el Calculo de las Percepciones en VENTAS
							} else {
								// Si no Hay Articulos Para Calcular Percepciones en VENTAS
								if (isEmpty(numberOfItems) || (!isEmpty(numberOfItems) && numberOfItems == 0)) {
									alert('No se ingresaron Articulos en la Transaccion');
									return true;
								} else {
									alert('Los Articulos Ingresados en la Transaccion No generan Percepciones');
									return true;
								}
							}
						//}
					}
				}
			}
		}
		nlapiLogExecution('DEBUG','calcular_percepciones_ventas','FIN DEL CÁLCULO DE PERCEPCIONES MANUAL');
	} catch (err) {
		alert('Error - Proceso cálculo de percepciones: ' + err.message);
		nlapiLogExecution('DEBUG','calcular_percepciones_ventas', 'LINE 349- Exception error NC Parciales:'+ err.message);
	}
}

function obtenerDatosLineas(item, itemImporte, importeBrutoLinea, numberLine) {
	
	var datosLinea = {};
	datosLinea.idArticulo = item;
	datosLinea.importeBrutoLinea = parseFloat(importeBrutoLinea, 10);
	datosLinea.importeNetoLinea = parseFloat(itemImporte, 10);
	datosLinea.lineNumber = numberLine;
	
	/********************************* DATOS JURISDICCION UTILIZACION *****************************/
                        
	datosLinea.jurisdUtilizacion = nlapiGetLineItemValue('item', 'custcol_l54_jurisdiccion_util_ventas', numberLine); //INDICA EL ID INTERNO DE LA JURISDICCION DE UTILIZACION A NIVEL DE LÍNEA
	datosLinea.nombreJurisdUtilizacion = nlapiGetLineItemText('item', 'custcol_l54_jurisdiccion_util_ventas', numberLine); //INDICA EL NOMBRE DE LA JURISDICCION DE UTILIZACION A NIVEL DE LÍNEA
								
	/********************************* DATOS JURISDICCION UTILIZACION *****************************/
		
	/********************************* DATOS JURISDICCION ORIGEN *****************************/
		
	datosLinea.jurisdOrigen = nlapiGetLineItemValue('item', 'custcol_l54_jurisdiccion_origen_vtas', numberLine); //INDICA EL ID INTERNO DE LA JURISDICCION DE ORIGEN A NIVEL DE LÍNEA
	datosLinea.nombreJurisdOrigen = nlapiGetLineItemText('item', 'custcol_l54_jurisdiccion_origen_vtas', numberLine); //INDICA EL NOMBRE DE LA JURISDICCION DE ORIGEN A NIVEL DE LÍNEA
								
	/********************************* DATOS JURISDICCION ORIGEN *****************************/
								
	/********************************* DATOS JURISDICCION ENTREGA *****************************/
		
	datosLinea.jurisdiccionEntrega = nlapiGetLineItemValue('item', 'custcol_l54_jurisdiccion_desti_ventas', numberLine); //INDICA EL ID INTERNO DE LA JURISDICCION DE DESTINO A NIVEL DE LÍNEA
	datosLinea.jurisdiccionEntregaNombre = nlapiGetLineItemText('item', 'custcol_l54_jurisdiccion_desti_ventas', numberLine); //INDICA EL NOMBRE DE LA JURISDICCION DE DESTINO A NIVEL DE LÍNEA
		
	/********************************* DATOS JURISDICCION s *****************************/
		
	/********************************* DATOS JURISDICCION FACTURACION *****************************/
		
	datosLinea.jurisdFacturacion = nlapiGetLineItemValue('item', 'custcol_l54_jurisdiccion_fact_ventas', numberLine);
	datosLinea.nombreJurisdFacturacion = nlapiGetLineItemText('item', 'custcol_l54_jurisdiccion_fact_ventas', numberLine);

	/********************************* DATOS JURISDICCION FACTURACION *****************************/

	/********************************* DATOS JURISDICCION EMPRESA *****************************/
		
	datosLinea.jurisdEmpresa = nlapiGetLineItemValue('item', 'custcol_l54_jurisdiccion_empresa_vtas', numberLine);
	datosLinea.nombreJurisdEmpresa = nlapiGetLineItemText('item', 'custcol_l54_jurisdiccion_empresa_vtas', numberLine);

	/********************************* DATOS JURISDICCION EMPRESA *****************************/

	return datosLinea;
}

function callBackPercepciones(response) {
	try {
		if (!isEmpty(response)) {
			var informacionPercepciones = JSON.parse(response.getBody());
			var param_codigo_IVA = informacionPercepciones.codigo_IVA;
			if (!isEmpty(informacionPercepciones)) {
				var mensajeFinalAlert="";
				if (informacionPercepciones.error == false) {
					// Inicio Grabar Informacion de las Percepciones en la Transaccion
					if (informacionPercepciones.infoPercepciones != null && informacionPercepciones.infoPercepciones.length > 0) {
						// elimino las líneas de percepciones ventas que estaban generadas en esta transacción

						var fecha = nlapiGetFieldValue('trandate');
						var numberOfItems = nlapiGetLineItemCount('item');

						for (var r = 1; r <= nlapiGetLineItemCount("item"); r++ ) {
							if (nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', r) == 'T' && nlapiGetLineItemValue('item', 'custcol_l54_tipo_percepcion_vtas', r) != param_codigo_IVA) {
								nlapiSelectLineItem("item", r);
								nlapiRemoveLineItem("item");
								r--;
							}
						}

						for (var i = 0; i < informacionPercepciones.infoPercepciones.length; i++) {

							//FDS1 chequueo la alicuota de percepción.
							var porcentajeAlicuota = Math.abs(parseFloat(informacionPercepciones.infoPercepciones[i].porcentaje, 10));

							if (porcentajeAlicuota > 0 || porcentajeAlicuota > 0.00) { //FDS1: Solo inserto si es distinto de 0 la alicuota de percepción

								nlapiSelectNewLineItem('item');
								nlapiSetCurrentLineItemValue('item', 'item', informacionPercepciones.infoPercepciones[i].item, true, true);
								nlapiSetCurrentLineItemValue('item', 'description', informacionPercepciones.infoPercepciones[i].descripcion);
								nlapiSetCurrentLineItemValue('item', 'quantity', informacionPercepciones.infoPercepciones[i].cantidad, true);
								nlapiSetCurrentLineItemValue('item', 'rate', informacionPercepciones.infoPercepciones[i].importeUnitario, true);
								nlapiSetCurrentLineItemValue('item', 'amount', informacionPercepciones.infoPercepciones[i].importeTotal, true);
								nlapiSetCurrentLineItemValue('item', 'taxcode', informacionPercepciones.infoPercepciones[i].codigoImpuesto, true, true);
								// Nuevo - Grabar Porcentaje de Impuesto y detalles de los importes
								nlapiSetCurrentLineItemValue('item', 'taxrate1', informacionPercepciones.infoPercepciones[i].porcentaje, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_jurisd_iibb_lineas', informacionPercepciones.infoPercepciones[i].jurisdiccion, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_pv_creada', informacionPercepciones.infoPercepciones[i].procesoPV);
								// Imp. Perc. redondeado a dos decimales
								nlapiSetCurrentLineItemValue('item', 'tax1amt', informacionPercepciones.infoPercepciones[i].importeImpuesto, true);
								// Imp. Perc. Original
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_percepcion_original', informacionPercepciones.infoPercepciones[i].importeImpuestoOriginal, true);
								// Diferencia por redondeo de Imp. Percepción
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_diferencia_redondeo', informacionPercepciones.infoPercepciones[i].diferenciaRedondeo, true);
								// Base de cálculo redondeada
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_monto_imp_perc', informacionPercepciones.infoPercepciones[i].montoImponible, true);
								// Base de cálculo original
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_calculo_original', informacionPercepciones.infoPercepciones[i].montoImponibleOriginal, true);
								// Nuevo - Grabar Importe Impuesto original, coeficiente base imponible y monto sujeto percepción en moneda local
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_coeficiente_base_imp', informacionPercepciones.infoPercepciones[i].coeficienteBaseImponible, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_imponible_original', informacionPercepciones.infoPercepciones[i].montoImponiblePercOriginal, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_monto_suj_perc_moneda_loc', informacionPercepciones.infoPercepciones[i].montoImponiblePercMonedaLocal, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_perc_moneda_loc', informacionPercepciones.infoPercepciones[i].importePercMonedaLocal, true);
								// Nuevo - Grabar Norma IIBB
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_norma_iibb_perc', informacionPercepciones.infoPercepciones[i].normaIIBB, true, true);
								// Nuevo - Grabar Tipo Contribuyente IIBB
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_tipo_contribuyente', informacionPercepciones.infoPercepciones[i].tipoContribuyenteIIBB, true, true);
								// Nuevo - Grabar Campo Alicuota
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_alicuota', informacionPercepciones.infoPercepciones[i].porcentaje, true, true);
								//alert("Alicuota : " + informacionPercepciones.infoPercepciones[i].porcentaje + " Norma IIBB : " + informacionPercepciones.infoPercepciones[i].normaIIBB);
								// NUEVO
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_porcentaje_desc_gral', 0, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_desc_gral', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_neto_sin_desc', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_impint_sin_desc', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_impuesto_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_net_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_total_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);

								// Seteo de campo nuevos de columnas de jurisdicciones
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_jurisdiccion_fact_ventas', '', true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_jurisdiccion_util_ventas', '', true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_jurisdiccion_desti_ventas', '', true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_jurisdiccion_origen_vtas', '', true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_jurisdiccion_empresa_vtas', '', true, true);

								// Si es una Orden de Venta cerrar la linea
								if(nlapiGetRecordType()=='salesorder'){
									nlapiSetCurrentLineItemValue('item', 'isclosed', 'T', true, true);
								}
								nlapiCommitLineItem('item');
							}
						}

						nlapiLogExecution('DEBUG', 'calcularPercepciones', 'informacionPercepciones.detalleAcumulados: ' + JSON.stringify(informacionPercepciones.detalleAcumulados));

						//INICIO - REGISTRO DE ACUMULADOS RETENCION IIBB
						if (!isEmpty(informacionPercepciones.detalleAcumulados) && informacionPercepciones.detalleAcumulados.length > 0) {
							for (var i = 0; i < informacionPercepciones.detalleAcumulados.length; i++) {
								nlapiLogExecution('DEBUG', 'calcularPercepciones', 'linea i: ' + i + ' / detalleAcumulados : ' + JSON.stringify(informacionPercepciones.detalleAcumulados[i]));

								nlapiSelectNewLineItem('recmachcustrecord_l54_acum_perc_trans_asoc');
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_cliente', informacionPercepciones.detalleAcumulados[i].cliente);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_periodo', informacionPercepciones.detalleAcumulados[i].periodo);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_subsidiaria', informacionPercepciones.detalleAcumulados[i].subsidiaria);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_base_calculo', informacionPercepciones.detalleAcumulados[i].baseCalculo);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_jurisdiccion', informacionPercepciones.detalleAcumulados[i].jurisdiccion);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_per_tipo_cambio', informacionPercepciones.detalleAcumulados[i].tipoCambio);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_fecha', fecha);
								nlapiSetCurrentLineItemValue('recmachcustrecord_l54_acum_perc_trans_asoc', 'custrecord_l54_acum_perc_anulado', false);
								nlapiCommitLineItem('recmachcustrecord_l54_acum_perc_trans_asoc');
							}
						}
						//FIN - REGISTRO DE ACUMULADOS RETENCION IIBB

					}
					// Fin Grabar Informacion de las Percepciones en la Transaccion
					// Informo Warnings
					var mensajeWarning = 'Aviso : \n ';
					if (informacionPercepciones.warning == true) {
						for (var i = 0; informacionPercepciones.mensajeWarning != null && i < informacionPercepciones.mensajeWarning.length; i++) {
							mensajeWarning += ((i + 1) + ' - ' + informacionPercepciones.mensajeWarning[i] + '\n');
						}
						//alert(mensajeWarning);
						mensajeFinalAlert+=mensajeWarning;
					}

					// Muestro el Mensaje de Finalizacion
					//alert(informacionPercepciones.mensajeOk);
					mensajeFinalAlert+=informacionPercepciones.mensajeOk + '\n';
				} else {
					// Muestro el Error
					var erroresCalculoPercepciones = "";
					if (informacionPercepciones.mensajeError != null && informacionPercepciones.mensajeError.length == 1) {
						erroresCalculoPercepciones = informacionPercepciones.mensajeError[0];
					} else {
						for (var i = 0; informacionPercepciones.mensajeError != null && i < informacionPercepciones.mensajeError.length; i++) {
							erroresCalculoPercepciones += informacionPercepciones.mensajeError[i] + '\n';
						}
					}
					//alert(erroresCalculoPercepciones);
					mensajeFinalAlert+=erroresCalculoPercepciones;
				}
				if (informacionPercepciones.errorImpInt == false) {
					// Inicio Grabar Informacion del Impuesto Interno en la Transaccion
					if (informacionPercepciones.infoImpuestoInterno != null && informacionPercepciones.infoImpuestoInterno.length > 0) {
						// elimino las líneas de Impuesto Interno que estaban generadas en esta transacción
						var numberOfItems = nlapiGetLineItemCount('item');

						for (var r = 1; r <= nlapiGetLineItemCount("item"); r++) {
							if (nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', r) == 'T' && nlapiGetLineItemValue('item', 'custcol_l54_tipo_percepcion_vtas', r) != param_codigo_IVA) {
								nlapiSelectLineItem("item", r);
								nlapiRemoveLineItem("item");
								r--;
							}
						}

						for (var i = 0; i < informacionPercepciones.infoImpuestoInterno.length; i++) {

								nlapiSelectNewLineItem('item');
								nlapiSetCurrentLineItemValue('item', 'item', informacionPercepciones.infoImpuestoInterno[i].item, true, true);
								//nlapiSetCurrentLineItemValue('item', 'description', informacionPercepciones.infoImpuestoInterno[i].descripcion);
								nlapiSetCurrentLineItemValue('item', 'quantity', informacionPercepciones.infoImpuestoInterno[i].cantidad, true);
								nlapiSetCurrentLineItemValue('item', 'rate', informacionPercepciones.infoImpuestoInterno[i].importeUnitario, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_calculo', informacionPercepciones.infoImpuestoInterno[i].baseCalculo, true);
								nlapiSetCurrentLineItemValue('item', 'amount', informacionPercepciones.infoImpuestoInterno[i].importeTotal, true);
								nlapiSetCurrentLineItemValue('item', 'taxcode', informacionPercepciones.infoImpuestoInterno[i].codigoImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'taxrate1', informacionPercepciones.infoImpuestoInterno[i].porcCodigoImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_impuesto_interno', informacionPercepciones.infoImpuestoInterno[i].impuestoInterno);
								nlapiSetCurrentLineItemValue('item', 'tax1amt', informacionPercepciones.infoImpuestoInterno[i].importeImpuesto, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_porcentaje_desc_gral', 0, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_desc_gral', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_neto_sin_desc', 0.00, true, true);
								// Si es una Orden de Venta cerrar la linea
								if(nlapiGetRecordType()=='salesorder'){
									nlapiSetCurrentLineItemValue('item', 'isclosed', 'T', true, true);
								}
								nlapiCommitLineItem('item');
							
						}

					}
					// Fin Grabar Informacion del Impuesto Interno en la Transaccion
					// Informo Warnings
					var mensajeWarning = 'Aviso : \n ';
					if (informacionPercepciones.warningImpInt == true) {
						for (var i = 0; informacionPercepciones.mensajeWarningImpInt != null && i < informacionPercepciones.mensajeWarningImpInt.length; i++) {
							mensajeWarningImpInt += ((i + 1) + ' - ' + informacionPercepciones.mensajeWarningImpInt[i] + '\n');
						}
						//alert(mensajeWarningImpInt);
						mensajeFinalAlert+=mensajeWarningImpInt;
					}

					// Muestro el Mensaje de Finalizacion
					//alert(informacionPercepciones.mensajeOkImpInt);
					mensajeFinalAlert+=informacionPercepciones.mensajeOkImpInt + '\n';
				} else {
					// Muestro el Error
					var erroresCalculoImpInterno = "";
					if (informacionPercepciones.mensajeErrorImpInt != null && informacionPercepciones.mensajeErrorImpInt.length == 1) {
						erroresCalculoImpInterno = informacionPercepciones.mensajeErrorImpInt[0];
					} else {
						for (var i = 0; informacionPercepciones.mensajeErrorImpInt != null && i < informacionPercepciones.mensajeErrorImpInt.length; i++) {
							erroresCalculoImpInterno += informacionPercepciones.mensajeErrorImpInt[i] + '\n';
						}
					}
					//alert(erroresCalculoImpInterno);
					mensajeFinalAlert+=erroresCalculoImpInterno;
				}
				// Informar Mensaje General
				alert(mensajeFinalAlert);
			} else {
				alert("Error Obteniendo Informacion de Percepciones en VENTAS");
			}
		} else {
			alert("Error Obteniendo Informacion de Percepciones en VENTAS");
		}
		if(nlapiGetRecordType() == 'creditmemo'){
			validPercepciones()
		}
	} catch (err) {
		alert("Error Calulando Percepcion en VENTAS , Error : " + err.message);
	}
}
function callBackPercepcionesIVA(response) {
	try {
		if (!isEmpty(response)) {
			var informacionPercepciones = JSON.parse(response.getBody());
			
			var param_codigo_IVA = informacionPercepciones.codigo_IVA;
			if (!isEmpty(informacionPercepciones)) {
				var mensajeFinalAlert="";
				if (informacionPercepciones.error == false) {
					// Inicio Grabar Informacion de las Percepciones en la Transaccion
					if (informacionPercepciones.infoPercepciones != null && informacionPercepciones.infoPercepciones.length > 0) {
						// elimino las líneas de percepciones ventas que estaban generadas en esta transacción
						var numberOfItems = nlapiGetLineItemCount('item');

						for (var r = 1; r <= nlapiGetLineItemCount("item"); r++) {
							if (nlapiGetLineItemValue('item', 'custcol_l54_pv_creada', r) == 'T' && nlapiGetLineItemValue('item', 'custcol_l54_tipo_percepcion_vtas', r) == param_codigo_IVA) {
								nlapiSelectLineItem("item", r);
								nlapiRemoveLineItem("item");
								r--;
							}
						}

						for (var i = 0; i < informacionPercepciones.infoPercepciones.length; i++) {

							//FDS1 chequueo la alicuota de percepción.
							var porcentajeAlicuota = Math.abs(parseFloat(informacionPercepciones.infoPercepciones[i].porcentaje, 10));

							if (porcentajeAlicuota > 0 || porcentajeAlicuota > 0.00) { //FDS1: Solo inserto si es distinto de 0 la alicuota de percepción

								nlapiSelectNewLineItem('item');
								nlapiSetCurrentLineItemValue('item', 'item', informacionPercepciones.infoPercepciones[i].item, true, true);
								nlapiSetCurrentLineItemValue('item', 'description', informacionPercepciones.infoPercepciones[i].descripcion);
								nlapiSetCurrentLineItemValue('item', 'quantity', informacionPercepciones.infoPercepciones[i].cantidad, true);
								nlapiSetCurrentLineItemValue('item', 'rate', informacionPercepciones.infoPercepciones[i].importeUnitario, true);
								nlapiSetCurrentLineItemValue('item', 'amount', informacionPercepciones.infoPercepciones[i].importeTotal, true);
								nlapiSetCurrentLineItemValue('item', 'taxcode', informacionPercepciones.infoPercepciones[i].codigoImpuesto, true, true);
								// Nuevo - Grabar Porcentaje de Impuesto y detalles de los importes
								nlapiSetCurrentLineItemValue('item', 'taxrate1', informacionPercepciones.infoPercepciones[i].porcentaje, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_jurisd_iibb_lineas', informacionPercepciones.infoPercepciones[i].jurisdiccion, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_pv_creada', informacionPercepciones.infoPercepciones[i].procesoPV);
								// Imp. Perc. redondeado a dos decimales
								nlapiSetCurrentLineItemValue('item', 'tax1amt', informacionPercepciones.infoPercepciones[i].importeImpuesto, true);
								// Imp. Perc. Original
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_percepcion_original', informacionPercepciones.infoPercepciones[i].importeImpuestoOriginal, true);
								// Diferencia por redondeo de Imp. Percepción
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_diferencia_redondeo', informacionPercepciones.infoPercepciones[i].diferenciaRedondeo, true);
								// Base de cálculo redondeada
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_monto_imp_perc', informacionPercepciones.infoPercepciones[i].montoImponible, true);
								// Base de cálculo original
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_calculo_original', informacionPercepciones.infoPercepciones[i].montoImponibleOriginal, true);
								// Nuevo - Grabar Importe Impuesto original, coeficiente base imponible y monto sujeto percepción en moneda local
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_coeficiente_base_imp', informacionPercepciones.infoPercepciones[i].coeficienteBaseImponible, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_imponible_original', informacionPercepciones.infoPercepciones[i].montoImponiblePercOriginal, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_monto_suj_perc_moneda_loc', informacionPercepciones.infoPercepciones[i].montoImponiblePercMonedaLocal, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_perc_moneda_loc', informacionPercepciones.infoPercepciones[i].importePercMonedaLocal, true);
								// Nuevo - Grabar Norma IIBB
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_norma_iibb_perc', informacionPercepciones.infoPercepciones[i].normaIIBB, true, true);
								// Nuevo - Grabar Tipo Contribuyente IIBB
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_tipo_contribuyente', informacionPercepciones.infoPercepciones[i].tipoContribuyenteIIBB, true, true);
								// Nuevo - Grabar Campo Alicuota
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_alicuota', informacionPercepciones.infoPercepciones[i].porcentaje, true, true);
								//alert("Alicuota : " + informacionPercepciones.infoPercepciones[i].porcentaje + " Norma IIBB : " + informacionPercepciones.infoPercepciones[i].normaIIBB);
								// NUEVO
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_porcentaje_desc_gral', 0, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_desc_gral', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_neto_sin_desc', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_impint_sin_desc', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_impuesto_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_net_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_total_sin_desc', informacionPercepciones.infoPercepciones[i].importeImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_tipo_percepcion_vtas', param_codigo_IVA , true, true);
								// Si es una Orden de Venta cerrar la linea
								if(nlapiGetRecordType()=='salesorder'){
									nlapiSetCurrentLineItemValue('item', 'isclosed', 'T', true, true);
								}
								nlapiCommitLineItem('item');
							}
						}

					}
					// Fin Grabar Informacion de las Percepciones en la Transaccion
					// Informo Warnings
					var mensajeWarning = 'Aviso : \n ';
					if (informacionPercepciones.warning == true) {
						for (var i = 0; informacionPercepciones.mensajeWarning != null && i < informacionPercepciones.mensajeWarning.length; i++) {
							mensajeWarning += ((i + 1) + ' - ' + informacionPercepciones.mensajeWarning[i] + '\n');
						}
						//alert(mensajeWarning);
						mensajeFinalAlert+=mensajeWarning;
					}

					// Muestro el Mensaje de Finalizacion
					//alert(informacionPercepciones.mensajeOk);
					mensajeFinalAlert+=informacionPercepciones.mensajeOk + '\n';
				} else {
					// Muestro el Error
					var erroresCalculoPercepciones = "";
					if (informacionPercepciones.mensajeError != null && informacionPercepciones.mensajeError.length == 1) {
						erroresCalculoPercepciones = informacionPercepciones.mensajeError[0];
					} else {
						for (var i = 0; informacionPercepciones.mensajeError != null && i < informacionPercepciones.mensajeError.length; i++) {
							erroresCalculoPercepciones += informacionPercepciones.mensajeError[i] + '\n';
						}
					}
					//alert(erroresCalculoPercepciones);
					mensajeFinalAlert+=erroresCalculoPercepciones;
				}
				if (informacionPercepciones.errorImpInt == false) {
					// Inicio Grabar Informacion del Impuesto Interno en la Transaccion
					if (informacionPercepciones.infoImpuestoInterno != null && informacionPercepciones.infoImpuestoInterno.length > 0) {
						// elimino las líneas de Impuesto Interno que estaban generadas en esta transacción
						var numberOfItems = nlapiGetLineItemCount('item');

						for (var r = 1; r <= nlapiGetLineItemCount("item"); r++) {
							if (nlapiGetLineItemValue('item', 'custcol_l54_impuesto_interno', r) == 'T' && nlapiGetLineItemValue('item', 'custcol_l54_tipo_percepcion_vtas', r) == param_codigo_IVA) {
								nlapiSelectLineItem("item", r);
								nlapiRemoveLineItem("item");
								r--;
							}
						}

						for (var i = 0; i < informacionPercepciones.infoImpuestoInterno.length; i++) {

								nlapiSelectNewLineItem('item');
								nlapiSetCurrentLineItemValue('item', 'item', informacionPercepciones.infoImpuestoInterno[i].item, true, true);
								//nlapiSetCurrentLineItemValue('item', 'description', informacionPercepciones.infoImpuestoInterno[i].descripcion);
								nlapiSetCurrentLineItemValue('item', 'quantity', informacionPercepciones.infoImpuestoInterno[i].cantidad, true);
								nlapiSetCurrentLineItemValue('item', 'rate', informacionPercepciones.infoImpuestoInterno[i].importeUnitario, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_base_calculo', informacionPercepciones.infoImpuestoInterno[i].baseCalculo, true);
								nlapiSetCurrentLineItemValue('item', 'amount', informacionPercepciones.infoImpuestoInterno[i].importeTotal, true);
								nlapiSetCurrentLineItemValue('item', 'taxcode', informacionPercepciones.infoImpuestoInterno[i].codigoImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'taxrate1', informacionPercepciones.infoImpuestoInterno[i].porcCodigoImpuesto, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_impuesto_interno', informacionPercepciones.infoImpuestoInterno[i].impuestoInterno);
								nlapiSetCurrentLineItemValue('item', 'tax1amt', informacionPercepciones.infoImpuestoInterno[i].importeImpuesto, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_porcentaje_desc_gral', 0, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_importe_desc_gral', 0.00, true, true);
								nlapiSetCurrentLineItemValue('item', 'custcol_l54_imp_neto_sin_desc', 0.00, true, true);
								// Si es una Orden de Venta cerrar la linea
								if(nlapiGetRecordType()=='salesorder'){
									nlapiSetCurrentLineItemValue('item', 'isclosed', 'T', true, true);
								}
								nlapiCommitLineItem('item');
							
						}

					}
					// Fin Grabar Informacion del Impuesto Interno en la Transaccion
					// Informo Warnings
					var mensajeWarning = 'Aviso : \n ';
					if (informacionPercepciones.warningImpInt == true) {
						for (var i = 0; informacionPercepciones.mensajeWarningImpInt != null && i < informacionPercepciones.mensajeWarningImpInt.length; i++) {
							mensajeWarningImpInt += ((i + 1) + ' - ' + informacionPercepciones.mensajeWarningImpInt[i] + '\n');
						}
						//alert(mensajeWarningImpInt);
						mensajeFinalAlert+=mensajeWarningImpInt;
					}

					// Muestro el Mensaje de Finalizacion
					//alert(informacionPercepciones.mensajeOkImpInt);
					mensajeFinalAlert+=informacionPercepciones.mensajeOkImpInt + '\n';
				} else {
					// Muestro el Error
					var erroresCalculoImpInterno = "";
					if (informacionPercepciones.mensajeErrorImpInt != null && informacionPercepciones.mensajeErrorImpInt.length == 1) {
						erroresCalculoImpInterno = informacionPercepciones.mensajeErrorImpInt[0];
					} else {
						for (var i = 0; informacionPercepciones.mensajeErrorImpInt != null && i < informacionPercepciones.mensajeErrorImpInt.length; i++) {
							erroresCalculoImpInterno += informacionPercepciones.mensajeErrorImpInt[i] + '\n';
						}
					}
					//alert(erroresCalculoImpInterno);
					mensajeFinalAlert+=erroresCalculoImpInterno;
				}
				// Informar Mensaje General
				alert(mensajeFinalAlert);
			} else {
				alert("Error Obteniendo Informacion de Percepciones en VENTAS");
			}
		} else {
			alert("Error Obteniendo Informacion de Percepciones en VENTAS");
		}
		if(nlapiGetRecordType() == 'creditmemo'){
			validPercepciones()
		}
	} catch (err) {
		alert("Error Calulando Percepcion en VENTAS , Error : " + err.message);
	}
}

function convertToBoolean(string) {

	return ((isEmpty(string) || string == 'F' || string == false) ? false : true);
}

function getDate(fecha, zonaHoraria){ //Toma una fecha ubicada en otra zona horaria y la mueve a GMT0. Con zonaHoraria se puede cambiar por otra diferente a GMT0
	var utc = new Date(fecha).getTime(); //GMT 0   
	zonaHoraria = isEmpty(zonaHoraria) ? 0 : zonaHoraria;
	return new Date(utc + (utc.getTimezoneOffset()*60000) + (3600000 * zonaHoraria));
}


function getCompanyDate(fecha) {
    var currentDateTime = new Date(fecha);
    var companyTimeZone = nlapiLoadConfiguration('companyinformation').getFieldText('timezone');
    var timeZoneOffSet = (companyTimeZone.indexOf('(GMT)') == 0) ? 0 : new Number(companyTimeZone.substr(4, 6).replace(/\+|:00/gi, '').replace(/:30/gi, '.5'));
    var UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset() * 60000);
    var companyDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);

    return new Date(companyDateTime);
}