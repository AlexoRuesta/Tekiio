/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NAmdConfig /SuiteScripts/configuration.json
 */
define(["N/record", "N/search", "N/runtime", "N/error", "L54/utilidades"],

    (record, search, runtime, error, utilidades) => {

        const beforeLoad = (scriptContext) => {
            try {
                const recType = scriptContext.newRecord.type;

                if (scriptContext.type = scriptContext.UserEventType.VIEW && (recType == 'invoice' || recType == 'creditmemo' || recType == 'cashsale')){
                    handlerGenerarBotonCAE_beforeLoad(scriptContext)
                }

                if (scriptContext.type != scriptContext.UserEventType.VIEW && (recType == 'invoice' || recType == 'salesorder')){
                    handlerCBUEmisorFCE_beforeLoad(scriptContext)
                }

                if (scriptContext.type != scriptContext.UserEventType.VIEW && recType == 'invoice'){
                    handlerValidarClienteFCE_beforeLoad(scriptContext)
                }
            } catch (e) {
                log.error('beforeSubmit', 'Ocurrió un error, detalles: ' + e.message);
                throw e.message;
            }
        }

        const beforeSubmit = (scriptContext) => {
            try {
                const recType = scriptContext.newRecord.type;

                if ((scriptContext.type = scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) && recType == 'invoice'){
                    handlerVerificacionPermisosEmbarques_beforeSubmit(scriptContext)
                }

                if ((scriptContext.type = scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT || scriptContext.type == scriptContext.UserEventType.COPY) && (recType == 'invoice' || recType == 'creditmemo' || recType == 'salesorder')){
                    handlerProcesarDescuentosConsecutivos_beforeSubmit(scriptContext)
                }

                if (scriptContext.type = scriptContext.UserEventType.CREATE && (recType == 'invoice' || recType == 'creditmemo')){
                    handlerVerificarFormaPago_beforeSubmit(scriptContext)
                }

                if ((scriptContext.type != scriptContext.UserEventType.VIEW || scriptContext.type != scriptContext.UserEventType.DELETE ) && (recType == 'invoice' || recType == 'salesorder')){
                    handlerCBUEmisorFCE_beforeSubmit(scriptContext)
                }
                
                 if (scriptContext.type != scriptContext.UserEventType.VIEW && recType == 'invoice'){
                    handlerValidarClienteFCE_beforeSubmit(scriptContext)
                }
            } catch (e) {
                log.error('beforeSubmit', 'Ocurrió un error, detalles: ' + e.message);
                throw e.message;
            }
        }

        const afterSubmit = (scriptContext) => {
             try {
                const recType = scriptContext.newRecord.type;

                if (scriptContext.type!= context.UserEventType.DELETE){
                    handlerSeteoTaxCodes_afterSubmit(scriptContext)
                }

                if ((scriptContext.type!= context.UserEventType.DELETE) && (recType == 'invoice' || recType == 'creditmemo')){
                    handlerLineaReversaIvatur_afterSubmit(scriptContext)
                }

                if ((scriptContext.type != scriptContext.UserEventType.VIEW || scriptContext.type != scriptContext.UserEventType.DELETE )  && runtime.executionContext == 'CSVIMPORT' && (recType == 'invoice' || recType == 'salesorder')){
                    handlerCBUEmisorFCE_afterSubmit(scriptContext)
                }
             } catch (e) {
                log.error('afterSubmit', 'Ocurrió un error, detalles: ' + e.message);
                throw e.message;
            }
        }
        
        /** L54-Verificar Permisos de Emb. FEX (UE) */
        function handlerVerificacionPermisosEmbarques_beforeSubmit(scriptContext){
             try {
                if (scriptContext.type = scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) {
                    let newRecord = scriptContext.newRecord;
                    log.debug(proceso, 'INICIO - validacion de permisos de embarque');
                    let existePermiso = newRecord.getValue('custbody_l54_existe_permiso_embar');
                    existePermiso = (utilidades.isEmpty(existePermiso) || existePermiso == 'F' || existePermiso == false) ? false : true;
                    let messagePermisosEmbarque = 'Los comprobantes de factura de exportación que son de exportación definitiva de bienes y que poseen permiso de embarque, necesitan informar los datos de los permisos de embarque de mercadería; estos valores se pueden ingresar en la sublista: "AR-Permisos Embarque Mercaderia"';
                    let tipoDoc = newRecord.getValue('custbody_l54_cod_trans_afip');
                    let recType = newRecord.type;
                    let tipoExportacion = newRecord.getValue('custbody_l54_tipo_expo_fex');
                    let paramTipoDocFacturaFEX = runtime.getCurrentScript().getParameter('custscript_l54_argentina_st_doc_fac');
                    let paramTipoExpDefinitivaBienes = runtime.getCurrentScript().getParameter('custscript_l54_argentina_st_de_b');

                    log.debug(proceso, `existePermiso: ${existePermiso} / tipoDoc: ${tipoDoc} / tipoExportacion: ${tipoExportacion} / paramTipoDocFacturaFEX: ${paramTipoDocFacturaFEX} / paramTipoExpDefinitivaBienes: ${paramTipoExpDefinitivaBienes}`);

                    if (recType == 'invoice' && existePermiso == true && !utilidades.isEmpty(tipoDoc) && !utilidades.isEmpty(paramTipoDocFacturaFEX) && !utilidades.isEmpty(paramTipoExpDefinitivaBienes)
                        && !utilidades.isEmpty(tipoExportacion) && tipoDoc == paramTipoDocFacturaFEX && tipoExportacion == paramTipoExpDefinitivaBienes) {

                        var lineasPermisosEmbarque = newRecord.getLineCount({ sublistId: 'recmachcustrecord_l54_perm_emb_me_id_trans' });
                        log.debug(proceso, `lineasPermisosEmbarque: ${lineasPermisosEmbarque}`);

                        if (utilidades.isEmpty(lineasPermisosEmbarque) || lineasPermisosEmbarque < 1) {
                            throw (error.create({
                                name: 'Error',
                                message: messagePermisosEmbarque,
                                notifyOff: true
                            }));
                        } else {
                            var arrayPaises = obtenerArrayPaises();
                            newRecord.setValue('custbody_l54_ar_embarque_json', '');
                            log.debug('LINE 148', 'Mode: ' + scriptContext.type + ' / recType: ' + recType);

                            log.debug('LINE 83', 'newRecord: '+ JSON.stringify(newRecord));
                            log.debug('LINE 84', 'arrayPaises: '+ JSON.stringify(arrayPaises));

                            var lineNum = newRecord.getLineCount({
                                sublistId: 'recmachcustrecord_l54_perm_emb_me_id_trans'
                            });
                            var arrayEmbarqueDocumemnto = []
                            log.debug('LINE 83', 'lineNum: '+ lineNum);
                            for (var i = 0; i < lineNum; i++) {
                                var objEmbarqTrans= {};
                                var idPais = newRecord.getSublistValue({
                                    sublistId: 'recmachcustrecord_l54_perm_emb_me_id_trans',
                                    fieldId: 'custrecord_l54_perm_emb_me_pais_destino',
                                    line: i
                                });
                                log.debug('LINE 62', 'codigoPais: '+ idPais);
                                var resultInfPais =  arrayPaises.filter(function(obj) {
                                    return (obj.idPais == idPais.toString());
                                });
                                objEmbarqTrans.nombrePais = resultInfPais[0].nombrePais;
                                objEmbarqTrans.idPermisoEmbarque = newRecord.getSublistValue({
                                    sublistId: 'recmachcustrecord_l54_perm_emb_me_id_trans',
                                    fieldId: 'custrecord_l54_perm_emb_me_id_permiso',
                                    line: i
                                });
                                
                                arrayEmbarqueDocumemnto.push(objEmbarqTrans);
                            }
                            log.debug('LINE 83', 'idsRefTrans: '+JSON.stringify(arrayEmbarqueDocumemnto));
                            newRecord.setValue('custbody_l54_ar_embarque_json', JSON.stringify(arrayEmbarqueDocumemnto));
                        }
                    }

                    log.debug(proceso, 'FIN - validacion de permisos de embarque');
                }
            } catch (e) {
                log.error('beforeSubmit', 'Ocurrió un error mientras se verificaban los permisos de embarque, detalles: ' + e.message);
                throw e.message;
            }
        }

        function obtenerArrayPaises() {
            var informacionCodigosPais = new Array();

            var searchPaisesFex = search.load({
                id: 'customsearch_l54_paises_fex_2'
            });

            var resultSearch = searchPaisesFex.run();

            var completeResultSet = null;

            var resultIndex = 0;
            var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
            var resultado; // temporary variable used to store the result set
            
            do {
                // fetch one result set
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

                    // once no records are returned we already got all of them
            } while (!utilidades.isEmpty(resultado) && resultado.length > 0)

            if (!utilidades.isEmpty(completeResultSet))
            {
                for (var i = 0; i < completeResultSet.length; i++) {
                    //log.debug('L54 - Calcular Retenciones (SS) - LINE 1316', 'INDICE: ' +i);
                    informacionCodigosPais[i] = new Object();
                    informacionCodigosPais[i].idPais = completeResultSet[i].getValue({
                            name: resultSearch.columns[1]
                    });
                    informacionCodigosPais[i].nombrePais = completeResultSet[i].getValue({
                            name: resultSearch.columns[0]
                    });
                }
            }
            log.debug('L54 - Buscar Pais', 'RETURN - informacionCodigosPais: ' +JSON.stringify(informacionCodigosPais));
            log.audit('L54 - Buscar Pais', 'FIN - obtenerArrayPaises');            
            return informacionCodigosPais;
        }

         /** L54 - UE Procesar Descuentos Consecutivo */
        function handlerProcesarDescuentosConsecutivos_beforeSubmit(scriptContext){
            const proceso = "beforeSubmit Procesar Descuentos Consecutivos";
            try {
      
                var newRec = scriptContext.newRecord,
                    oldRec = scriptContext.oldRecord,
                    discountRate  = newRec.getValue("discountrate"),
                    discountTotal = newRec.getValue("discounttotal"),
                    subtotal = newRec.getValue("subtotal"),
                    discountItem  = newRec.getValue("discountitem");
                
                log.debug("discountRate", discountRate)
                const campoMarcado = newRec.getValue('custbody_l54_excluir_descuentos');
                if (campoMarcado) {
                  log.debug('No ejecuta el proceso', 'Se detiene ejecución del User Event');
                  return; // <-- corta la ejecución del resto del script
                }

                var linesQty = newRec.getLineCount({ sublistId: 'item'});

                var errorGeneral = false;
                var jsonLines = {};

                if(!utilidades.isEmpty(oldRec)){
                  var  discountRateOld  = newRec.getValue("discountrate"),
                        discountTotalOld = newRec.getValue("discounttotal"),
                        discountItemOld  = newRec.getValue("discountitem");

                    var linesQtyOld = oldRec.getLineCount({ sublistId: 'item'});
                }else{
                    var  discountRateOld  = "",
                        discountTotalOld = "",
                        discountItemOld  = "";
                    var linesQtyOld = 0;
                }
              var objRecord = scriptContext.newRecord; 

              var valor = scriptContext.type == 'create' ? scriptContext.newRecord.getValue("discountrate") :  scriptContext.newRecord.getText("discountrate");
                log.debug("valor", typeof valor)
              if(typeof valor === 'number' || (typeof valor === 'string' && !valor.includes('%'))){
                let numberValue = parseLatamNumber(valor);
                log.debug("numberValue", numberValue)
                let aux = (numberValue/ subtotal) *100 ; 
                log.debug("aux", aux);

                discountRate = aux;
              }

              var cae = objRecord.getValue("custbody_l54_cae");
                
                log.audit(proceso,'INICIO -transaccion: '+ newRec.type+' '+newRec.id +' - scriptContext.type: '+scriptContext.type+' - discItem: '+discountItem+' - discItemOld: '+discountItemOld+' - discRate:'+discountRate+' - discRateOld:'+discountRateOld);
                
                if(((scriptContext.type == 'create' || scriptContext.type == 'copy' || scriptContext.type == 'edit') && !utilidades.isEmpty(discountRate)) && utilidades.isEmpty(cae) && !esCero(discountRate)){
                    try{
                      log.audit(proceso,'Removiendo líneas de descuento antiguas...');
                     
                      var lines = objRecord.getLineCount({
                        sublistId: 'item'
                      });
                      for(let i = 0; i < lines; i++){
                        let isSysDiscount = objRecord.getSublistValue({
                          sublistId: 'item',
                          fieldId:'custcol_l54_system_discount',
                          line: i
                        });
                        log.debug(i,'isSysDiscount:'+isSysDiscount);
                        if(isSysDiscount == 'T' || isSysDiscount == true){
                          objRecord.removeLine({
                            sublistId: 'item',
                            line: i
                          });
                          log.debug('line '+i, 'removed')
                          i--;
                          lines--;
                        }
                      }
                      log.audit(proceso,'Líneas de descuento antiguas removidas.');
                    }catch(e){
                      log.error('ERROR REMOVIENDO LÍNEAS DE DESCUENTO GENERAL PARA TRANSACCION: '+newRec.type+' - '+newRec.id,e);
                      errorGeneral = true;
                    }

                  if(!utilidades.isEmpty(discountItem) && !utilidades.isEmpty(discountRate) && Number(discountRate) != 0.00){
                    if(!errorGeneral){
                      try{
                        log.audit(proceso,'Agregando líneas de descuento nuevas...');
                        for(let i = 0; i < lines; i++){
                            var secondValidate = false;
                          let itemType = objRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId:'itemtype',
                            line: i
                          });
                          let itemAmt = objRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId:'amount',
                            line: i
                          });
                          let taxCode = objRecord.getSublistValue({
                            sublistId: 'item',
                            fieldId:'taxcode',
                            line: i
                          });

                          if(itemType != 'Discount' && itemAmt > 0){
                            jsonLines = {
                                itemType : itemType,
                                itemAmt: itemAmt,
                                taxCode : taxCode
                            }
                            log.debug("jsonLines",jsonLines)
                          }else if(itemType == 'Discount'){
                            jsonLines.itemAmt = jsonLines.itemAmt + itemAmt;
                            log.debug("jsonLines.itemAmt", jsonLines.itemAmt)
                            secondValidate = true;
                          }
                          
                          
                        
                        var typeItem = objRecord.getSublistValue({ sublistId: "item", fieldId: "itemtype", line: i+1 });
                    
                            if (secondValidate || (typeItem != "Subtotal" && typeItem != "Description" && typeItem != "Group" && typeItem != "EndGroup" && typeItem != "Discount"  && itemAmt > 0)) {
                                
                                objRecord.insertLine({
                                    sublistId: 'item',
                                    line: i+1
                                });
                                objRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId:'item',
                                    value: discountItem,
                                    line: i+1
                                });
                                objRecord.setSublistValue({
                                  sublistId: 'item',
                                  fieldId:'price',
                                  value: -1,
                                  line: i+1
                              });
                              log.debug("discountRate", discountRate)
                                let a = Math.abs(Number(jsonLines.itemAmt) * Number(discountRate)/100)*-1
                                /*objRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId:'rate',
                                    value: discountRate,
                                    line: i+1
                                });*/
                              objRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId:'amount',
                                    value: a,
                                    line: i+1
                                });
                                log.debug("monto", a)
                                objRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId:'taxcode',
                                    value: jsonLines.taxCode,
                                    line: i+1
                                });
                                /*objRecord.setSublistValue({
                                  sublistId: 'item',
                                  fieldId:'grossamt',
                                  value: a,
                                  line: i+1
                              });*/
                                objRecord.setSublistValue({
                                    sublistId: 'item',
                                    fieldId:'custcol_l54_system_discount',
                                    value: true,
                                    line: i+1
                                });
                            }
                          
                            lines = objRecord.getLineCount({
                                sublistId: 'item'
                            });
                           
                        }
                      }catch(e){
                        log.error('ERROR EN CALCULO DE DESCUENTO GENERAL PARA TRANSACCION: '+newRec.type+' - '+newRec.id,e);
                      }
                      log.audit(proceso,'Líneas de descuento nuevas agregadas.');
                    }

                    //objRecord.setValue({ fieldId: "discountitem", value: "" });
                    objRecord.setValue({ fieldId: "discountrate", value: "" });

                    lines = objRecord.getLineCount({
                      sublistId: 'item'
                  });
                   
                }
                  
              }
            }catch(e){
                log.error("Error " + proceso, e)
            }
        }

        function parseLatamNumber(valor) {
          if (valor === null || valor === undefined) return NaN;

          let str = valor.toString().trim();

          // Caso 1: formato US puro → 1234.56 o -80022.5
          if (/^-?\d+(\.\d+)?$/.test(str)) {
              return parseFloat(str);
          }

          // Caso 2: formato LATAM → 12.345,67 o -1.234,5
          // Quitar miles y cambiar coma por punto
          return parseFloat(
              str
                  .replace(/\./g, '')   // separadores de miles
                  .replace(',', '.')    // decimales
          );
        }

        function esCero(valor) {
          if (valor === null || valor === undefined) return true;

          // Convertir cualquier tipo a string
          let str = valor.toString().trim();

          // Quitar símbolo %
          str = str.replace('%', '');

          // Reemplazar coma decimal por punto (formato LATAM)
          str = str.replace(',', '.');

          // Quitar separadores de miles
          str = str.replace(/\./g, '.');

          // Convertir a número
          let num = parseFloat(str);

          // Si no es número, no lo trates como cero
          if (isNaN(num)) return true;

          // Comparar con 0 (considerando flotantes)
          return Math.abs(num) < 0.000001;
        }

        /** L54 - Seteo de Tax Codes */
        function handlerSeteoTaxCodes_afterSubmit(context){
            const proceso = "afterSubmit";

            try {
                if (context.type != context.UserEventType.DELETE) {
                    const objRecord = record.load({
                        type: context.newRecord.type,
                        id: context.newRecord.id,
                    });

                    const { taxByRef, taxDetailsQuantity } = buildTaxMap(objRecord);

                    if (taxDetailsQuantity > 0) {
                        setearColumnasConTaxDetailsFast("item", objRecord, taxByRef);
                        setearColumnasConTaxDetailsFast("expense", objRecord, taxByRef);
                    }

                    desaplicarYAplicarNC(context.newRecord.type, objRecord);

                    objRecord.save();

                }
            } catch (error) {
                log.error(proceso, `Error NetSuite Excepcion - detalles: ${error.message}`);
            }
        };

    function isEmpty(val) {
        return val === "" || val === undefined || val === "undefined" || val === null || val === "null" || (val.length === 0) || (typeof val == "object" && Object.keys(val).length === 0);
    }

  
    function desaplicarYAplicarNC(recType, objRecord) {
        const idTransApply = [];
        if (recType == "creditmemo" || recType == "vendorcredit") {
            const cantidadItems = objRecord.getLineCount({ sublistId: "apply" });
            for (let j = 0; j < cantidadItems; j++) {
                const aplicado = objRecord.getSublistValue({ sublistId: "apply", fieldId: "apply", line: j });
                if (aplicado == "T" || aplicado == true) {
                    const internalIdLine = objRecord.getSublistValue({ sublistId: "apply", fieldId: "internalid", line: j });
                    idTransApply.push({
                        internalId: internalIdLine,
                        line: j
                    });
                    objRecord.setSublistValue({ sublistId: "apply", fieldId: "apply", line: j, value: false });
                }
            }

            log.debug("desaplicarYAplicarNC", "LINE 153 - idTransApply: " + JSON.stringify(idTransApply));
            if (idTransApply && idTransApply.length > 0) {
                for (let j = 0; j < idTransApply.length; j++) {
                    log.debug("desaplicarYAplicarNC", "LINE 156 - INVOICE DATA APPLIED (T): " + idTransApply[j].internalId);
                    objRecord.setSublistValue({ sublistId: "apply", fieldId: "apply", line: idTransApply[j].line, value: true });
                }
            }
        }
    }


    function buildTaxMap(objRecord) {
        const taxDetailsQuantity = objRecord.getLineCount({ sublistId: "taxdetails" });
        const taxByRef = Object.create(null);

        for (let i = 0; i < taxDetailsQuantity; i++) {
            const ref = objRecord.getSublistValue("taxdetails", "taxdetailsreference", i);
            if (!ref) continue;

            taxByRef[ref] = {
            taxCode: objRecord.getSublistValue("taxdetails", "taxcode", i),
            taxRate: objRecord.getSublistValue("taxdetails", "taxrate", i),
            };
        }

        return { taxByRef, taxDetailsQuantity };
    }

    function setearColumnasConTaxDetailsFast(tipoLista, objRecord, taxByRef) {
        const listaQuantity = objRecord.getLineCount({ sublistId: tipoLista });

        for (let i = 0; i < listaQuantity; i++) {
            const taxDetailReferenceItem = objRecord.getSublistValue(tipoLista, "taxdetailsreference", i);
            const itemType = objRecord.getSublistValue(tipoLista, "itemtype", i);
            const itemInGroup = objRecord.getSublistValue(tipoLista, "ingroup", i);

            const taxInfo = taxDetailReferenceItem ? taxByRef[taxDetailReferenceItem] : null;

            if (taxInfo) {
            // setear solo si cambia
            const curCode = objRecord.getSublistValue(tipoLista, "custcol_l54_codigo_impuesto", i);
            if (curCode !== taxInfo.taxCode) {
                objRecord.setSublistValue(tipoLista, "custcol_l54_codigo_impuesto", i, taxInfo.taxCode);
            }

            const curRate = objRecord.getSublistValue(tipoLista, "custcol_l54_tasa_impuesto", i);
            if (curRate !== taxInfo.taxRate) {
                objRecord.setSublistValue(tipoLista, "custcol_l54_tasa_impuesto", i, taxInfo.taxRate);
            }

            // lógica de grupo (igual que tu script)
            if ((itemInGroup === "T" || itemInGroup === true) && i > 0) {
                const beforeLine = i - 1;
                const itemTypeItemBefore = objRecord.getSublistValue(tipoLista, "itemtype", beforeLine);
                if (itemTypeItemBefore === "Group") {
                const curCodeBefore = objRecord.getSublistValue(tipoLista, "custcol_l54_codigo_impuesto", beforeLine);
                if (curCodeBefore !== taxInfo.taxCode) {
                    objRecord.setSublistValue(tipoLista, "custcol_l54_codigo_impuesto", beforeLine, taxInfo.taxCode);
                }

                const curRateBefore = objRecord.getSublistValue(tipoLista, "custcol_l54_tasa_impuesto", beforeLine);
                if (curRateBefore !== taxInfo.taxRate) {
                    objRecord.setSublistValue(tipoLista, "custcol_l54_tasa_impuesto", beforeLine, taxInfo.taxRate);
                }
                }
            }
            } else if (itemType === "Discount" && i > 0) {
            // copiar del anterior (tu lógica)
            const taxCodeLineItemBefore = objRecord.getSublistValue(tipoLista, "custcol_l54_codigo_impuesto", i - 1);
            const taxRateLineItemBefore = objRecord.getSublistValue(tipoLista, "custcol_l54_tasa_impuesto", i - 1);

            objRecord.setSublistValue(tipoLista, "custcol_l54_codigo_impuesto", i, taxCodeLineItemBefore);
            objRecord.setSublistValue(tipoLista, "custcol_l54_tasa_impuesto", i, taxRateLineItemBefore);
            }
            // si querés mantener el error log, hacelo “suave” y no por cada línea
        }
    }

    /** L54 - Linea de reintegro IVA T (SS) **/
    function handlerLineaReversaIvatur_afterSubmit(context) {
        if (context.type == context.UserEventType.DELETE) return;

        var rec = context.newRecord;
        rec = record.load({
        type: rec.type,
        id: rec.id,
        });

        var idTransaccionesT = runtime.getCurrentScript().getParameter("custscript_l54_argentina_st_tur").split(",");
        var artDescuento = runtime.getCurrentScript().getParameter("custscript_l54_argentina_st_reintegro");
        var ivaDescuento = runtime.getCurrentScript().getParameter("custscript_l54_argentina_st_imp_reintegr");
        var refNum = rec.getValue("custbody_l54_ref_numerador");
        var esTransaccionT = false;
        if (!isEmpty(refNum)) {
        var idTransaccionAfip = record.load({
            type: "customrecord_l54_numeradores",
            id: refNum,
            isDynamic: false
        }).getValue("custrecord_l54_num_id_trans_afip");
        //var idTransaccionAfip = rec.getValue('custbody_l54_tipo_transaccion');
        log.debug("customrecord_l54_numeradores.custrecord_l54_num_id_trans_afip", idTransaccionAfip);
        var ivaReversa = 0.00;
        esTransaccionT = idTransaccionesT.filter(function (elem) {
            return elem == idTransaccionAfip;
        }).length > 0;
        }
        log.debug("esTransaccionT", esTransaccionT);
        if (esTransaccionT) {
        var lineas = rec.getLineCount({
            sublistId: "item"
        });
        log.debug("lineas", lineas);
        for (var i = 0; i < lineas; i++) {
            log.debug("linea", i);
            //rec.selectLine({
            //sublistId: 'item',
            //line: i
            //});
            var codTurismoAfip = rec.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_l54_id_cod_turismo_afip",
            line: i
            });
            var llevaReintegro = (codTurismoAfip == "1" || codTurismoAfip == "2") ? true : false;
            log.debug("llevaReintegro", llevaReintegro);
            var esLineaReintegro = rec.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_l54_reintegro_iva_tur",
            line: i
            });
            esLineaReintegro = (esLineaReintegro == "T" || esLineaReintegro == true) ? true : false;
            log.debug("esLineaReintegro", esLineaReintegro);
            if (llevaReintegro == true) {
            ivaReversa += parseFloat(rec.getSublistValue({
                sublistId: "item",
                fieldId: "taxamount",
                line: i
            }));
            } else if (esLineaReintegro == true) {
            rec.removeLine({
                sublistId: "item",
                line: i
            });
            i--;
            lineas--;
            }
        }
        log.debug("ivaReversa", ivaReversa);
        if (ivaReversa > 0) {
            //rec.selectNewLine({
            //sublistId: 'item'
            //});
            rec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: artDescuento,
            line: i
            });
            rec.setSublistValue({
            sublistId: "item",
            fieldId: "custcol_l54_codigo_impuesto",
            value: ivaDescuento,
            line: i
            });
            rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -ivaReversa,
            line: i
            });
        }
        }
        //FIN - MANEJO PARA COMPROBANTES DE TIPO TURISMO

        var esNumeradorManual = rec.getValue("custbody_l54_numerador_manual");
        log.debug("afterSubmit", "esNumeradorManual: " + esNumeradorManual);

        // INICIO - Seteo de Campo: L54 - Formas de Pago Transacción
        if (esTransaccionT && !isEmpty(esNumeradorManual) && esNumeradorManual) {
        var idSublista = "recmachcustrecord_l54_form_pago_tran_id_trasacc";
        var cantFormasPago = rec.getLineCount(idSublista);
        var arrayFormasPago = [];
        for (var i = 0; !isEmpty(cantFormasPago) && i < cantFormasPago; i++) {
            var obj = {};
            obj.codigoFP = "";
            obj.descriFP = "";
            obj.codigoTC = "";
            obj.descriTC = "";
            obj.swiftCode = "";
            obj.nroCuenta = "";
            obj.codigoTT = "";
            obj.descriTT = "";
            obj.numeroTarj = "";
            obj.importe = "";

            if (!isEmpty(rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_cod_fp", line: i })))
            obj.codigoFP = rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_cod_fp", line: i });

            if (!isEmpty(rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_fp", line: i })))
            obj.descriFP = rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_fp", line: i });

            if (!isEmpty(rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_cod_tip_cu", line: i })))
            obj.codigoTC = rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_cod_tip_cu", line: i });

            if (!isEmpty(rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_tipo_cta", line: i })))
            obj.descriTC = rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_tipo_cta", line: i });

            if (!isEmpty(rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_swift", line: i })))
            obj.swiftCode = rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_swift", line: i });

            if (!isEmpty(rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_nro_cta", line: i })))
            obj.nroCuenta = rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_nro_cta", line: i });

            if (!isEmpty(rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_tarj_cod", line: i })))
            obj.codigoTT = rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_tarj_cod", line: i });

            if (!isEmpty(rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_tipo_tarj", line: i })))
            obj.descriTT = rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_tipo_tarj", line: i });

            if (!isEmpty(rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_nro_tarj", line: i })))
            obj.numeroTarj = rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_nro_tarj", line: i });

            if (!isEmpty(rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_importe", line: i })))
            obj.importe = rec.getSublistValue({ sublistId: idSublista, fieldId: "custrecord_l54_form_pago_tran_importe", line: i });

            arrayFormasPago.push(obj);
        }

        if (!isEmpty(arrayFormasPago)) {
            if (arrayFormasPago.length > 0) {
            var formasPagoString = JSON.stringify(arrayFormasPago);
            rec.setValue("custbody_l54_form_pago_tran_list", formasPagoString);
            }
        }
        }

        var recType = context.newRecord.type;
        // Se desmarca el check de la factura aplicada si es el caso
        var idTransApply = [];
        if (recType == "creditmemo") {
        var cantidadItems = rec.getLineCount({ sublistId: "apply" });
        for (var j = 0; j < cantidadItems; j++) {
            var aplicado = rec.getSublistValue({ sublistId: "apply", fieldId: "apply", line: j });
            if (aplicado == "T" || aplicado == true) {
            var internalIdLine = rec.getSublistValue({ sublistId: "apply", fieldId: "internalid", line: j });
            idTransApply.push({
                internalId: internalIdLine,
                line: j
            });
            rec.setSublistValue({ sublistId: "apply", fieldId: "apply", line: j, value: false });
            }
        }

        log.debug("afterSubmit", "LINE 83 - idTransApply: " + JSON.stringify(idTransApply));
        if (!isEmpty(idTransApply) && idTransApply.length > 0) {
            for (var j = 0; j < idTransApply.length; j++) {
            log.debug("afterSubmit", "LINE 86 - INVOICE DATA APPLIED (T): " + idTransApply[j].internalId);
            rec.setSublistValue({ sublistId: "apply", fieldId: "apply", line: idTransApply[j].line, value: true });
            }
        }
        }
        rec.save();
        // llamar despues de guardar, que debe cargarlo de nuevo.
        setearMontoEscrito(context.newRecord);
    }

    function setearMontoEscrito(rec) {
        var recNew = record.load({
        type: rec.type,
        id: rec.id
        });
        var totalNew = recNew.getValue({ fieldId: "total" });
        log.debug("afterSubmit", "totalNew: " + totalNew);
        var subsidiaria = utilidades.l54esOneworld() ? recNew.getValue("subsidiary") : null;
        var numeroEnLetras = utilidades.getNumeroEnLetras(String(totalNew), subsidiaria);
        if (!utilidades.isEmpty(numeroEnLetras)) {
        log.debug("afterSubmit", "montoEscrito: " + numeroEnLetras);
        recNew.setValue("custbody_l54_monto_escrito", numeroEnLetras);
        }

        recNew.save();
    }

    function isEmpty(val) {
        return val == "" || val == undefined || val == null || val == "null" || val == "undefined";
    }

    /** L54 - Generar Boton CAE **/
    function handlerGenerarBotonCAE_beforeLoad(context) {
        const proceso = "beforeLoad";
        const type = context.type;
        const newRecord = context.newRecord;

        if (type == "view") {

        log.debug(proceso, "INICIO - beforeLoad Generar boton CAE");
        // Obtengo Punto de Venta y Letra de Transaccion

        const recId = newRecord.id;
        const recType = newRecord.type;
        log.debug({
            title: proceso,
            details: JSON.stringify({
            recId,
            recType
            })
        })
        let recordObj;
        try {
            recordObj = search.lookupFields({
            type: recType,
            id: recId,
            columns: ['custbody_l54_cae', 'custbody_l54_letra', 'custbody_l54_boca', 'custbody_l54_nd', 'custbody_l54_liquido_producto', 'custbody_l54_es_credito_electronico', 'approvalstatus', 'subsidiary', 'custbody_l54_trans_interna']
            });

        } catch (e) {
            // No Se Pudo Cargar el Registro
            // SOLO GRABO EN NETSUITE NO EN BD
            grabarError(1, 3, 1, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
            recordObj = null;
        }
        //if(!utilidades.isEmpty(resultadoTransaccion) && resultadoTransaccion.length>0){
        if (!utilidades.isEmpty(recordObj)) {
            if (utilidades.isEmpty(recordObj.custbody_l54_cae)) {
            const letra = recordObj.custbody_l54_letra[0] ? recordObj.custbody_l54_letra[0].value : "";
            const punto_venta = recordObj.custbody_l54_boca[0] ? recordObj.custbody_l54_boca[0].value : "";
            let esNotaDebito = recordObj.custbody_l54_nd ? recordObj.custbody_l54_nd : false;
            esNotaDebito = (utilidades.isEmpty(esNotaDebito) || esNotaDebito == "F" || esNotaDebito == false) ? false : true;
            let esLiquidoProducto = recordObj.custbody_l54_liquido_producto ? recordObj.custbody_l54_liquido_producto : false;
            let esCreditoElectronico = recordObj.custbody_l54_es_credito_electronico ? recordObj.custbody_l54_es_credito_electronico : false;
            if (utilidades.isEmpty(esLiquidoProducto)) {
                esLiquidoProducto = false;
            }
            if (utilidades.isEmpty(esCreditoElectronico)) {
                esCreditoElectronico = false;
            }
            const approvalStatus = recordObj.approvalstatus[0] ? recordObj.approvalstatus[0].value : "";
            log.debug("generarBotonCAE", `Generar Boton CAE - approvalStatus: ${approvalStatus}`);

            if (!utilidades.isEmpty(letra) && !utilidades.isEmpty(punto_venta) && (utilidades.isEmpty(approvalStatus) || approvalStatus == "2")) {
                // Busco el IDInterno del Typo de Transaccion de la Lista
                const idTipoRegistro = getValueFromList("customlist_l54_tipo_transaccion", recType);

                log.debug(proceso, `Linea 220 - resultadoTransaccion:  ${idTipoRegistro} / esNotaDebito: ${esNotaDebito}`);

                if (!utilidades.isEmpty(idTipoRegistro)) {
                // Busco el tipo de Transaccion L54
                const filtroTipoTransaccion = [
                    search.createFilter({
                    name: "isinactive",
                    operator: search.Operator.IS,
                    values: false, // Añadido filtro para excluir inactivos
                    }),
                    search.createFilter({
                    name: "custrecord_l54_tipo_trans_netsuite",
                    operator: search.Operator.IS,
                    values: idTipoRegistro,
                    }),
                    search.createFilter({
                    name: "custrecord_l54_es_nd",
                    operator: search.Operator.IS,
                    values: esNotaDebito,
                    })
                ];

                const resultadoTipoTransaccion = search.create({
                    type: "customrecord_l54_numerador_transaccion",
                    filters: filtroTipoTransaccion,
                    columns: ["custrecord_l54_tipo_trans_l54"],
                }).run().getRange({ start: 0, end: 1 });

                log.debug(proceso, `Linea 243 - resultadoTipoTransaccion:  ${JSON.stringify(resultadoTipoTransaccion)}`);

                if (!utilidades.isEmpty(resultadoTipoTransaccion) && resultadoTipoTransaccion.length > 0) {
                    const idTipoTransaccion = resultadoTipoTransaccion[0].getValue("custrecord_l54_tipo_trans_l54");
                    if (!utilidades.isEmpty(idTipoTransaccion)) {
                    // Obtengo el ID de Transaccion de AFIP y el Tipo de Middleware (FE o FEX)
                    // Obtengo la subsidiaria
                    let subsidiaria = "";
                    if (utilidades.l54esOneworld()) {
                        subsidiaria = recordObj.subsidiary[0] ? recordObj.subsidiary[0].value : "";
                        if (utilidades.isEmpty(subsidiaria)) // Si no completo la Subsidiaria, envio sin Subsidiaria
                        subsidiaria = "";
                    }
                    const filtroTransaccion = [
                        search.createFilter({
                        name: "isinactive",
                        operator: search.Operator.IS,
                        values: false, // Añadido filtro para excluir inactivos
                        }),
                        search.createFilter({
                        name: "custrecord_l54_num_boca",
                        operator: search.Operator.IS,
                        values: punto_venta,
                        }),
                        search.createFilter({
                        name: "custrecord_l54_num_letra",
                        operator: search.Operator.IS,
                        values: letra,
                        }),
                        search.createFilter({
                        name: "custrecord_l54_num_tipo_trans",
                        operator: search.Operator.IS,
                        values: idTipoTransaccion,
                        }),
                        search.createFilter({
                        name: "custrecord_l54_num_liquido_producto",
                        operator: search.Operator.IS,
                        values: esLiquidoProducto,
                        }),
                        search.createFilter({
                        name: "custrecord_l54_num_credito_electronico",
                        operator: search.Operator.IS,
                        values: esCreditoElectronico,
                        }),
                    ];
                    if (!utilidades.isEmpty(subsidiaria)) {
                        filtroTransaccion.push(search.createFilter({
                        name: "custrecord_l54_num_subsidiaria",
                        operator: search.Operator.IS,
                        values: subsidiaria,
                        }));
                    }
                    const columnaTransaccion = [
                        "custrecord_l54_num_tipo_trans_afip",
                        "custrecord_l54_num_tipo", // Si es vacio es porque no se le calcula CAE o no se Configuro
                        "custrecord_l54_num_electronico"
                    ];

                    const resultadoTransaccion = search.create({
                        type: "customrecord_l54_numeradores",
                        filters: filtroTransaccion,
                        columns: columnaTransaccion,
                    }).run().getRange({ start: 0, end: 1 });

                    log.debug(proceso, `Linea 303 - resultadoTransaccion:  ${JSON.stringify(resultadoTransaccion)}`);

                    if (!utilidades.isEmpty(resultadoTransaccion) && resultadoTransaccion.length > 0) {
                        const idTransaccionAFIPParcial = resultadoTransaccion[0].getValue("custrecord_l54_num_tipo_trans_afip");
                        const tipoMiddleware = resultadoTransaccion[0].getValue("custrecord_l54_num_tipo");
                        const numeradorElectronico = resultadoTransaccion[0].getValue("custrecord_l54_num_electronico");

                        log.debug(proceso, `Linea 310 - idTransaccionAFIPParcial: ${idTransaccionAFIPParcial} / tipoMiddleware: ${tipoMiddleware} / numeradorElectronico: ${numeradorElectronico}`);

                        if ((numeradorElectronico == true) || (tipoMiddleware != 1)) {
                        if (!utilidades.isEmpty(idTransaccionAFIPParcial) && !utilidades.isEmpty(tipoMiddleware)) {
                            // Busco el ID de Transaccion de AFIP
                            const resultadoIDAFIP = search.create({
                            type: "customrecord_l54_id_trans_afip",
                            filters: search.createFilter({
                                name: "internalid",
                                operator: search.Operator.ANYOF,
                                values: idTransaccionAFIPParcial
                            }),
                            columns: ["custrecord_l54_id_afip_id"]
                            }).run().getRange({ start: 0, end: 1 });
                            log.debug(proceso, "resultadoIDAFIP=" + resultadoIDAFIP);
                            if (!utilidades.isEmpty(resultadoIDAFIP) && resultadoIDAFIP.length > 0) {
                            const idTransaccionAFIP = resultadoIDAFIP[0].getValue("custrecord_l54_id_afip_id");
                            if (idTransaccionAFIP != null && idTransaccionAFIP > 0) {
                                // Obtengo la URL del Middleware Correspondiente
                                // Busco el Usuario y Password  y URL del Middleware de la Configuracion, el cual se utilizara para Buscar informacion en NetSuite.
                                const filtroConfiguracion = new Array();
                                filtroConfiguracion.push({
                                name: "isinactive",
                                operator: "is",
                                values: false
                                });
                                if (!utilidades.isEmpty(subsidiaria)) {
                                filtroConfiguracion.push(search.createFilter({
                                    name: "custrecord_l54_conf_m_subsidiaria",
                                    operator: search.Operator.ANYOF,
                                    values: subsidiaria
                                }));
                                }

                                const resultadoConfiguracion = search.create({
                                type: "customrecord_l54_conf_middleware",
                                filters: filtroConfiguracion,
                                columns: [
                                    "custrecord_l54_conf_m_link",
                                    "custrecord_l54_conf_m_usuario",
                                    "custrecord_l54_conf_m_pasw_encriptada",
                                    "custrecord_3k_url_rest_solicitud",
                                    "custrecord_3k_url_rest_actualizar",
                                    "custrecord_3k_generar_cae_auto",
                                    "custrecord_l54_conf_m_id_rol",
                                    "custrecord_l54_conf_m_cuenta",
                                ],
                                }).run().getRange({ start: 0, end: 1 });
                                log.debug(proceso, "resultadoConfiguracion= " + JSON.stringify(resultadoConfiguracion));
                                log.debug(proceso, "resultadoConfiguracion password= " + JSON.stringify(resultadoConfiguracion.values.custrecord_l54_conf_m_pasw_encriptada));
                                if (!utilidades.isEmpty(resultadoConfiguracion) && resultadoConfiguracion.length > 0) {
                                const middlewareURL = resultadoConfiguracion[0].getValue("custrecord_l54_conf_m_link");
                                const usuario = resultadoConfiguracion[0].getValue("custrecord_l54_conf_m_usuario");
                                const password = resultadoConfiguracion[0].getValue("custrecord_l54_conf_m_pasw_encriptada");
                            
                                
                                const generarCaeAutomatico = resultadoConfiguracion[0].getValue("custrecord_3k_generar_cae_auto");
                                const rol = resultadoConfiguracion[0].getValue("custrecord_l54_conf_m_id_rol");
                                const cuenta = resultadoConfiguracion[0].getValue("custrecord_l54_conf_m_cuenta");
                                log.debug("{ middlewareURL, usuario, password, cuenta, rol, }", JSON.stringify({ middlewareURL, usuario, password, cuenta, rol, generarCaeAutomatico }));
                                if ((middlewareURL.length != 0 || !utilidades.isEmpty(middlewareURL)) && !utilidades.isEmpty(usuario) && !utilidades.isEmpty(password) && !utilidades.isEmpty(cuenta) && rol != null && rol > 0) {
                                    //if ((middlewareURL.length != 0 || !utilidades.isEmpty(middlewareURL)) && !utilidades.isEmpty(usuario) && !utilidades.isEmpty(password) && !utilidades.isEmpty(URLRESTSolicitud) && !utilidades.isEmpty(URLRESTActualizacion) && !utilidades.isEmpty(cuenta) && rol != null && rol > 0) {
                                    if (generarCaeAutomatico === false) {
                                    try {
                                        const form = context.form;
                                        var transaccion_interna = recordObj.custbody_l54_trans_interna || false;
                                        form.clientScriptModulePath = "./L54 - Generar CAE (cliente).js";

                                        if(!transaccion_interna){
                                        form.addButton({ id: "custpage_boton_generar_cae", label: "Generar CAE", functionName: "generar_cae()" });
                                        }

                                    } catch (e) {
                                        log.error("Error creando boton - Generar CAE", "NetSuite error: " + e.message);
                                    }
                                    }
                                } else {
                                    //No se ha Configurados Campos Requeridos del Middleware ERROR 22
                                    // SOLO GRABO EN NETSUITE NO EN BD
                                    grabarError(1, 3, 22, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
                                }
                                } else {
                                //Falta Configuracion de Middleware ERROR 21
                                // SOLO GRABO EN NETSUITE NO EN BD
                                grabarError(1, 3, 21, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
                                }
                            } else {
                                // Falta Configurar ID Transaccion AFIP ERROR 47
                                // SOLO GRABO EN NETSUITE NO EN BD
                                grabarError(1, 3, 47, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
                            }
                            } else {
                            // Falta Configurar ID Transaccion AFIP ERROR 47
                            // SOLO GRABO EN NETSUITE NO EN BD
                            grabarError(1, 3, 47, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
                            }
                        } else {
                            // Falta Configurar ID Transaccion AFIP o Tipo Middleware ERROR 20
                            // SOLO GRABO EN NETSUITE NO EN BD
                            grabarError(1, 3, 20, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
                        }
                        }
                    } else {
                        // Falta Numerador // Error 19
                        // SOLO GRABO EN NETSUITE NO EN BD
                        grabarError(1, 3, 19, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
                    }
                    } else {
                    // Falta Configurar Tipos de Transacciones
                    // Grabar LOG y Detalle LOG
                    // SOLO GRABO EN NETSUITE NO EN BD
                    grabarError(1, 3, 46, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
                    }
                } else {
                    // Falta Configurar Tipos de Transacciones
                    // Grabar LOG y Detalle LOG
                    // SOLO GRABO EN NETSUITE NO EN BD
                    grabarError(1, 3, 46, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
                }
                } else {
                // Error falta Configurar Tipo de Transaccion
                // Grabar LOG y Detalle LOG
                // SOLO GRABO EN NETSUITE NO EN BD
                grabarError(1, 3, 61, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
                }
            } else {
                // Falta Punto de Venta o Letra ERROR 8
                // Grabar LOG y Detalle LOG
                // SOLO GRABO EN NETSUITE NO EN BD
                grabarError(1, 3, 8, recId); // Parametros 1� servicio, 2� tipoMiddleware , 3� id de tipo de error
            }
            }
        }

        log.debug(proceso, "FIN - beforeLoad Generar boton CAE");
        }
    }

     function getValueFromList(list, key) {
        let listID = "";

        const filter = search.createFilter({
        name: "name",
        operator: search.Operator.IS,
        values: key,
        });

        const results = search.create({
        type: list,
        filters: filter,
        columns: ["internalId"]
        }).run().getRange({
        start: 0,
        end: 1
        });

        if (!utilidades.isEmpty(results) && results.length > 0) {
        listID = results[0].getValue("internalId");
        }
        return listID;
    }


    function grabarError(servicio, tipoMiddleware, idTipoError, recId) {
        log.audit("grabarError parametros:", JSON.stringify({ servicio, tipoMiddleware, idTipoError, recId }));
        // Busco el ultimo LOG	, grabado desde aca , es decir aquel error que existe en NetSuite pero no en la Base de Datos
        // Ah estos errores los grabo como JOBNS- , para diferenciarlo con los que se graban desde el middleware, para
        // que aca al tomar el ultimo idexterno y sumarle 1, luego la base de datos con su indice propio no pueda generar uno igual
        // ya que la Base de Datos lo graba como JOB- . IGUAL EL ID EXTERNO SOLO SE USA PARA RELACIONAR DETALLE DE LOG CON ESTADO LOG.
        let idExternoFinal = "";
        const filtroLog = search.createFilter({
        name: "custrecord_3k_middl_origen",
        operator: search.Operator.IS,
        values: "1",
        });
        const columnaLog = new Array();
        // columnaLog[0] = new nlobjSearchColumn("created").setSort(true);
        columnaLog[0] = search.createColumn({
        name: "created",
        // DESC es true.
        //https://suiteanswers.custhelp.com/app/answers/detail/a_id/10272 setSort(order)
        sort: search.Sort.DESC
        });
        // columnaLog[1] = new nlobjSearchColumn("externalid");
        columnaLog[1] = search.createColumn({
        name: "externalid",
        });
        // const resultadoLog = new nlapiSearchRecord("customrecord_3k_middl_log", null, filtroLog, columnaLog);
        const resultadoLog = search.create({
        type: "customrecord_3k_middl_log",
        filters: filtroLog,
        columns: columnaLog,
        }).run().getRange({ start: 0, end: 1 });


        if (!utilidades.isEmpty(resultadoLog) && resultadoLog.length > 0) {
        const ultimoIDExterno = resultadoLog[0].getValue("externalid");
        log.debug("ultimoIDExterno", ultimoIDExterno);
        // Parseo el Resultado
        const posicionSeparador = ultimoIDExterno.lastIndexOf("-");
        if (posicionSeparador != null && posicionSeparador > 0) {
            const idExterno = ultimoIDExterno.substr(posicionSeparador + 1, 255);
            if (!utilidades.isEmpty(idExterno)) {
            const idPrevio = parseInt(idExterno, 10);
            const idNuevo = parseInt(idPrevio, 10) + parseInt(1, 10);
            idExternoFinal = "JOBNS-" + idNuevo;
            }
        }
        } else {
        // Si no hay ninguno grabo el primero
        idExternoFinal = "JOBNS-1";
        }
        log.debug("idExternoFinal", idExternoFinal);
        // const recordLog = nlapiCreateRecord("customrecord_3k_middl_log");
        const recordLog = record.create({ type: "customrecord_3k_middl_log" });
        //recordLog.setFieldValue("custrecord_3k_middl_servicio", servicio); // 1 - CAE
        recordLog.setValue({
        fieldId: "custrecord_3k_middl_servicio",
        value: servicio
        });
        //recordLog.setDateTimeValue("custrecord_3k_middl_fecha", myDate3, "America/Buenos_Aires");
        const fechaActual = new Date();
        recordLog.setValue({
        fieldId: "custrecord_3k_middl_fecha",
        value: fechaActual
        });
        // recordLog.setFieldValue("custrecord_3k_middl_estado", 2); // Error
        recordLog.setValue({
        fieldId: "custrecord_3k_middl_estado",
        value: 2
        });
        // recordLog.setFieldValue("custrecord_3k_middl_tipo_fact", tipoMiddleware); // 1 - FE , 2 FEX
        recordLog.setValue({
        fieldId: "custrecord_3k_middl_tipo_fact",
        value: tipoMiddleware
        });
        // recordLog.setFieldValue("custrecord_3k_middl_origen", 1); // 1 - NetSuite , 2 - Middleware
        recordLog.setValue({
        fieldId: "custrecord_3k_middl_origen",
        value: 1
        });
        // recordLog.setFieldValue("externalid", idExternoFinal); // 1 - FE , 2 FEX
        recordLog.setValue({
        fieldId: "externalid",
        value: idExternoFinal
        });
        let error = false;
        let idRL;
        try {
        idRL = recordLog.save();
        } catch (e) {
        log.error("Error Grabando Log", "NetSuite error: " + e.message);
        error = true;
        }
        if (error == false) {
        // Grabo el Detalle
        // const recordDetalleLog = nlapiCreateRecord("customrecord_3k_middl_detalle_log");
        const recordDetalleLog = record.create({ type: "customrecord_3k_middl_detalle_log" });
        // recordDetalleLog.setFieldValue("custrecord_3k_middl_det_id_error", idTipoError);
        recordDetalleLog.setValue({
            fieldId: "custrecord_3k_middl_det_id_error",
            value: idTipoError
        });
        // recordDetalleLog.setDateTimeValue("custrecord_3k_middl_det_fecha", myDate3, "America/Buenos_Aires"); // Buenos Aires GMT-03:00
        recordDetalleLog.setValue({
            fieldId: "custrecord_3k_middl_det_fecha",
            value: fechaActual
        });
        // recordDetalleLog.setFieldValue("custrecord_3k_middl_det_log", idRL);
        recordDetalleLog.setValue({
            fieldId: "custrecord_3k_middl_det_log",
            value: idRL
        });
        // recordDetalleLog.setFieldValue("custrecord_3k_middl_det_desc_error", ""); // No le Pongo Detalle
        recordDetalleLog.setValue({
            fieldId: "custrecord_3k_middl_det_desc_error",
            value: ""
        });

        if (!utilidades.isEmpty(recId)) {
            // recordDetalleLog.setFieldValue("custrecord_3k_middl_det_id_transaccion", recId);
            recordDetalleLog.setValue({
            fieldId: "custrecord_3k_middl_det_id_transaccion",
            value: recId
            });
        }
        try {
            // const idRDL = nlapiSubmitRecord(recordDetalleLog);
            recordDetalleLog.save();
        } catch (e) {
            // nlapiLogExecution("ERROR", "Error Grabando Detalle Log", "NetSuite error: " + e.message);
            log.error("Error Grabando Detalle Log", "NetSuite error: " + e.message);
        }
        }
    }

    /** L54 - Verif. Forma Pago y Datos Turista **/
     function handlerVerificarFormaPago_beforeSubmit(scriptContext) {
        try {
            var name = 'NOTICE (SuiteScript)';
            var messageDatosTurista = 'Los comprobantes de tipo Turismo debe tener al menos un turista cargado en la sublista "L54-Datos Turista Comprobante" para ser reportado posteriormente en el Regimen Informativo Reintegro de IVA Facturado Por Servicios De Alojamiento a Turistas Extranjeros';
            var messageFormaPago = 'Las Facturas y Notas de Débito de tipo Turismo debe tener al menos una forma de pago cargada en la sublista "L54-Formas De Pago Transaccion (TUR)" para ser reportado posteriormente en el Regimen Informativo Reintegro de IVA Facturado Por Servicios De Alojamiento a Turistas Extranjeros';
            var currentScript = runtime.getCurrentScript();
            var activarValidacionesTurista = false;
            activarValidacionesTurista = currentScript.getParameter({ name: 'custscript_l54_argentina_st_datos_turist' });
            var activarValidacionesFormaPago = false;
            activarValidacionesFormaPago = currentScript.getParameter({ name: 'custscript_l54_argentina_st_formas_pago' });
            log.debug('beforeSubmit', 'activarValidacionesTurista: ' + activarValidacionesTurista + ' -- activarValidacionesFormaPago: ' + activarValidacionesFormaPago);

            if (scriptContext.type == scriptContext.UserEventType.CREATE && ((!utilidades.isEmpty(activarValidacionesTurista) && activarValidacionesTurista == true) || (!utilidades.isEmpty(activarValidacionesFormaPago) && activarValidacionesFormaPago == true))) {
                var newRecord = scriptContext.newRecord;
                var recType = newRecord.type;
                var filtroNumerador = [];
                var columnaNumerador = [];
                var tipoTransId = '';
                var tipoTransStr = recType;
                var esND = newRecord.getValue('custbody_l54_nd');
                var letra = newRecord.getValue('custbody_l54_letra');
                var puntoVenta = newRecord.getValue('custbody_l54_boca');

                if (utilidades.isEmpty(esND))
                    esND = 'F';

                if (utilidades.l54esOneworld())
                    var subsidiaria = newRecord.getValue('subsidiary');
                else
                    var subsidiaria = null;

                tipoTransId = numeradorAUtilizarSS(getTipoTransId(tipoTransStr), esND, subsidiaria);
                log.debug('beforeSubmit', 'value of tipoTransId: ' + tipoTransId);

                filtroNumerador[0] = search.createFilter({
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: 'F'
                });

                filtroNumerador[1] = search.createFilter({
                    name: 'custrecord_l54_num_tipo_trans',
                    operator: search.Operator.ANYOF,
                    values: tipoTransId
                });

                filtroNumerador[2] = search.createFilter({
                    name: 'custrecord_l54_num_letra',
                    operator: search.Operator.IS,
                    values: letra
                });

                filtroNumerador[3] = search.createFilter({
                    name: 'custrecord_l54_num_boca',
                    operator: search.Operator.IS,
                    values: puntoVenta
                });

                if (!utilidades.isEmpty(subsidiaria)) {
                    filtroNumerador[4] = search.createFilter({
                        name: 'custrecord_l54_num_subsidiaria',
                        operator: search.Operator.ANYOF,
                        values: subsidiaria
                    });
                }

                columnaNumerador[0] = search.createColumn({
                    name: 'id'
                });

                columnaNumerador[1] = search.createColumn({
                    name: 'custrecord_l54_num_id_trans_afip'
                });

                var resultadoNumerador = search.create({
                    type: 'customrecord_l54_numeradores',
                    columns: columnaNumerador,
                    filters: filtroNumerador
                }).run().getRange({
                    start: 0,
                    end: 10
                });

                
                if (!utilidades.isEmpty(activarValidacionesTurista) && activarValidacionesTurista == true && !utilidades.isEmpty(resultadoNumerador) && resultadoNumerador.length > 0 && (resultadoNumerador[0].getValue('custrecord_l54_num_id_trans_afip') == 195 || resultadoNumerador[0].getValue('custrecord_l54_num_id_trans_afip') == 196 || resultadoNumerador[0].getValue('custrecord_l54_num_id_trans_afip') == 197)) {
                    var lineDatosTurista = newRecord.getLineCount({ sublistId: 'recmachcustrecord_l54_datos_turista_transac_ref' });

                    if (utilidades.isEmpty(lineDatosTurista) || lineDatosTurista < 1) {
                        throw(error.create({
                            name: name,
                            message: messageDatosTurista,
                            notifyOff: true
                            })
                        );
                    }
                }

                if (!utilidades.isEmpty(activarValidacionesFormaPago) && activarValidacionesFormaPago == true && !utilidades.isEmpty(resultadoNumerador) && resultadoNumerador.length > 0 && (resultadoNumerador[0].getValue('custrecord_l54_num_id_trans_afip') == 195 || resultadoNumerador[0].getValue('custrecord_l54_num_id_trans_afip') == 196)) {
                    var lineDatosFormaPago = newRecord.getLineCount({ sublistId: 'recmachcustrecord_l54_form_pago_tran_id_trasacc' });

                    if (utilidades.isEmpty(lineDatosFormaPago) || lineDatosFormaPago < 1) {
                        throw(error.create({
                            name: name,
                            message: messageFormaPago,
                            notifyOff: true
                            })
                        );
                    }
                }
            } else {
                if (scriptContext.type == scriptContext.UserEventType.EDIT && ((!utilidades.isEmpty(activarValidacionesTurista) && activarValidacionesTurista == true) || (!utilidades.isEmpty(activarValidacionesFormaPago) && activarValidacionesFormaPago == true))) {
                    var newRecord = scriptContext.newRecord;
                    var codigoAFIP = newRecord.getValue('custbody_l54_cod_trans_afip');

                    if (!utilidades.isEmpty(activarValidacionesTurista) && activarValidacionesTurista == true && !utilidades.isEmpty(codigoAFIP) && (codigoAFIP == 195 || codigoAFIP == 196 || codigoAFIP == 197)) {
                        var lineDatosTurista = newRecord.getLineCount({ sublistId: 'recmachcustrecord_l54_datos_turista_transac_ref' });
                        
                        if (utilidades.isEmpty(lineDatosTurista) || lineDatosTurista < 1) {
                            
                            throw(error.create({
                                name: name,
                                message: messageDatosTurista,
                                notifyOff: true
                                })
                            );
                        }
                    }

                    if (!utilidades.isEmpty(activarValidacionesFormaPago) && activarValidacionesFormaPago == true && !utilidades.isEmpty(codigoAFIP) && (codigoAFIP == 195 || codigoAFIP == 196)) {
                        var lineDatosFormaPago = newRecord.getLineCount({ sublistId: 'recmachcustrecord_l54_form_pago_tran_id_trasacc' });
                        
                        if (utilidades.isEmpty(lineDatosFormaPago) || lineDatosFormaPago < 1) {
                            
                            throw(error.create({
                                name: name,
                                message: messageFormaPago,
                                notifyOff: true
                                })
                            );
                        }
                    }
                }
            }
        } catch (e) {
            log.error('beforeSubmit', 'Excepción - Detalle: ' + e.message);
            throw e.message;
        }
        return true;
    }

    function getTipoTransId(tipoTransStr) {
        if (!utilidades.isEmpty(tipoTransStr)) {

            var filters = [];
            filters[0] = search.createFilter({
                name: 'name',
                operator: search.Operator.IS,
                values: tipoTransStr
            });

            var results = search.create({
                type: 'customlist_l54_tipo_transaccion',
                columns: ['internalId'],
                filters: filters
            }).run().getRange({
                start: 0,
                end: 100
            });

            log.debug('getTipoTransId', 'Result SS ' + JSON.stringify(results));

            if (results != null && results.length == 1)
                return results[0].getValue('internalId');
            else
                return null;

        }
        return null;
    }

    function numeradorAUtilizarSS(tipoTransNetSuite, esND, subsidiaria) {

        if (!utilidades.isEmpty(tipoTransNetSuite)) {

            var columns = [];
            columns[0] = search.createColumn({
                name: "custrecord_l54_tipo_trans_l54"
            });

            var filters = [];
            filters[0] = search.createFilter({
                name: 'custrecord_l54_tipo_trans_netsuite',
                operator: search.Operator.IS,
                values: tipoTransNetSuite
            });

            filters[1] = search.createFilter({
                name: 'isinactive',
                operator: search.Operator.IS,
                values: 'F'
            });

            if (!utilidades.isEmpty(esND)) {
                filters[2] = search.createFilter({
                    name: 'custrecord_l54_es_nd',
                    operator: search.Operator.IS,
                    values: esND
                });
            } else {
                filters[2] = search.createFilter({
                    name: 'custrecord_l54_es_nd',
                    operator: search.Operator.IS,
                    values: 'F'
                });
            }

            if (!utilidades.isEmpty(subsidiaria)) {
                filters[3] = search.createFilter({
                    name: 'custrecord_l54_num_trans_subsidiaria',
                    operator: search.Operator.ANYOF,
                    values: subsidiaria
                });
            }

            var results = search.create({
                type: 'customrecord_l54_numerador_transaccion',
                columns: columns,
                filters: filters
            }).run().getRange({
                start: 0,
                end: 100
            });

            if (results != null && results.length > 0)
                return results[0].getValue('custrecord_l54_tipo_trans_l54');
        }

        return null;
    }

    /** L54 - CBU Emisor FCE (SS) **/
     function handlerCBUEmisorFCE_beforeLoad(scriptContext) {

        try {

            if (scriptContext.type != 'view') {

                var objRecord = scriptContext.newRecord;
                var recType = objRecord.type;

                log.debug(proceso, 'INICIO - beforeLoad - recType: ' + recType);

                var cbuEmisor = objRecord.getValue({ fieldId: 'custbody_l54_cbu_emisor' });
                var esCredElectronico = objRecord.getValue({ fieldId: 'custbody_l54_es_credito_electronico' });
                var esNotaDebito = objRecord.getValue({ fieldId: 'custbody_l54_nd' });
                var isOneWorld = utilidades.l54esOneworld();
                var emisorCBU = '';

                log.debug(proceso, 'isOneWorld: ' + isOneWorld + ', cbuEmisor: ' + cbuEmisor + ', esCredElectronico: ' + esCredElectronico + ', esNotaDebito: ' + esNotaDebito);

                if (esCredElectronico && utilidades.isEmpty(cbuEmisor) && !esNotaDebito) {
                    var idSubsidiaria = '';
                    if (isOneWorld) {
                        idSubsidiaria = objRecord.getValue({ fieldId: 'subsidiary' });
                    }

                    if (isOneWorld && !utilidades.isEmpty(idSubsidiaria)) {
                        emisorCBU = consultaDatosImpositivos(idSubsidiaria, isOneWorld);
                    } else if (!isOneWorld) {
                        emisorCBU = consultaDatosImpositivos(null, isOneWorld);
                    }
                    log.debug(proceso, 'emisorCBU: ' + emisorCBU);

                    objRecord.setValue({ fieldId: 'custbody_l54_cbu_emisor', value: emisorCBU });
                }

                log.debug(proceso, 'FIN - beforeLoad  - recType: ' + recType);

            }
        } catch (e) {
            log.error(proceso, 'Function beforeLoad: ' + e.message);
        }
    }

    function handlerCBUEmisorFCE_beforeSubmit(scriptContext) {

        try {

            if (scriptContext.type != 'view' && scriptContext.type != 'delete') {

                var objRecord = scriptContext.newRecord;
                var recType = objRecord.type;

                log.debug(proceso, 'INICIO - beforeSubmit - recType: ' + recType);

                var emisorCBU = '';
                var cbuEmisor = objRecord.getValue({ fieldId: 'custbody_l54_cbu_emisor' });
                var esCredElectronico = objRecord.getValue({ fieldId: 'custbody_l54_es_credito_electronico' });
                var esNotaDebito = objRecord.getValue({ fieldId: 'custbody_l54_nd' });
                var formaNegociacion = objRecord.getValue({ fieldId: 'custbody_l54_forma_negociacion' });

                if (!utilidades.isEmpty(formaNegociacion)) {
                    var textFormaNegociacion = search.lookupFields({
                        type: 'customlist_l54_listado_formas_negociac',
                        id: formaNegociacion,
                        columns: 'name'
                    });
                }

                var isOneWorld = utilidades.l54esOneworld();

                log.debug(proceso, 'isOneWorld: ' + isOneWorld + ', cbuEmisor: ' + cbuEmisor + ', esCredElectronico: ' + esCredElectronico + ', esNotaDebito: ' + esNotaDebito + ', formaNegociacion: ' + formaNegociacion + ', textFormaNegociacion: ' + JSON.stringify(textFormaNegociacion));

                if (esCredElectronico && utilidades.isEmpty(cbuEmisor) && !esNotaDebito) {
                    var idSubsidiaria = '';
                    if (isOneWorld) {
                        idSubsidiaria = objRecord.getValue({ fieldId: 'subsidiary' });
                    }
                    emisorCBU = consultaDatosImpositivos(idSubsidiaria, isOneWorld);
                    log.debug(proceso, 'emisorCBU: ' + emisorCBU);

                    objRecord.setValue({ fieldId: 'custbody_l54_cbu_emisor', value: emisorCBU });
                }

                if (scriptContext.newRecord.type == 'invoice' && !esNotaDebito && esCredElectronico) {

                    var currScript = runtime.getCurrentScript();
                    var parametroTipoDato = currScript.getParameter('custscript_l54_argentina_st_cbu_emisor');
                    var parametroTipoOpcionalFormaNegociacion = currScript.getParameter('custscript_l54_argentina_st_forma_neg');
                    var parametroFormaNegociacionNoAplica = currScript.getParameter('custscript_l54_argentina_st_neg_no_aplic');

                    log.debug(proceso, 'parametroTipoDato: ' + parametroTipoDato + ' - parametroTipoOpcionalFormaNegociacion: ' + parametroTipoOpcionalFormaNegociacion + ' - parametroFormaNegociacionNoAplica: ' + parametroFormaNegociacionNoAplica);

                    if (utilidades.isEmpty(emisorCBU) && !utilidades.isEmpty(cbuEmisor)) {
                        emisorCBU = cbuEmisor;
                    }

                    if (!utilidades.isEmpty(parametroTipoDato) && !utilidades.isEmpty(emisorCBU)) {

                        var lineaOpcional = objRecord.getLineCount({
                            sublistId: 'recmachcustrecord_l54_opcionales_trans_transac'
                        });

                        log.debug(proceso, 'lineaOpcional: ' + lineaOpcional + ' - runtime.executionContext: ' + runtime.executionContext);

                        var cbuEmisorExistente = false;
                        var existeOpcionalFormaNegociacion = false;

                        if (!utilidades.isEmpty(lineaOpcional) && lineaOpcional > 0 && runtime.executionContext != 'CSVIMPORT') {
                            // if (!utilidades.isEmpty(lineaOpcional) && lineaOpcional > 0) {
                            for (var i = 0; i < lineaOpcional; i++) {
                                var opcional = objRecord.getSublistValue({ sublistId: 'recmachcustrecord_l54_opcionales_trans_transac', fieldId: 'custrecord_l54_opcionales_trans_opcional', line: i });

                                //Si en la sublista ya se encuentra la línea para el CBU Emisor, se actualiza el Valor
                                if (opcional == parametroTipoDato) {
                                    log.debug(proceso, 'LINE 134 - opcional: ' + opcional);
                                    objRecord.setSublistValue({
                                        sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                        fieldId: 'custrecord_l54_opcionales_trans_val_opc',
                                        value: emisorCBU,
                                        line: i
                                    });
                                    cbuEmisorExistente = true;
                                } else {
                                    //Si en la sublista ya se encuentra la línea para el opcional Forma de Negociación, se actualiza el Valor
                                    if (opcional == parametroTipoOpcionalFormaNegociacion && formaNegociacion != parametroFormaNegociacionNoAplica) {
                                        log.debug(proceso, 'LINE 146 - opcional: ' + opcional);
                                        objRecord.setSublistValue({
                                            sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                            fieldId: 'custrecord_l54_opcionales_trans_val_opc',
                                            value: textFormaNegociacion.name,
                                            line: i
                                        });
                                        existeOpcionalFormaNegociacion = true;
                                    }
                                }
                            }
                        }

                        log.debug(proceso, 'cbuEmisorExistente: ' + cbuEmisorExistente);

                        var lineaOpcionalFormaNegociacion = lineaOpcional;
                        //Si en la sublista no se encuentra la línea para el CBU Emisor, se agrega
                        if (runtime.executionContext != 'CSVIMPORT' && lineaOpcionalFormaNegociacion >= 0 && !cbuEmisorExistente) {
                            objRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                fieldId: 'custrecord_l54_opcionales_trans_val_opc',
                                value: emisorCBU,
                                line: lineaOpcionalFormaNegociacion
                            });
                            objRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                fieldId: 'custrecord_l54_opcionales_trans_opcional',
                                value: parametroTipoDato,
                                line: lineaOpcionalFormaNegociacion
                            });
                            lineaOpcionalFormaNegociacion += 1;
                        }

                        log.debug(proceso, 'lineaOpcionalFormaNegociacion: ' + lineaOpcionalFormaNegociacion);

                        //Si en la sublista no se encuentra la línea para el CBU Emisor, se agrega
                        if (runtime.executionContext != 'CSVIMPORT' && lineaOpcionalFormaNegociacion >= 0 && !existeOpcionalFormaNegociacion && formaNegociacion != parametroFormaNegociacionNoAplica) {
                            objRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                fieldId: 'custrecord_l54_opcionales_trans_val_opc',
                                value: textFormaNegociacion.name,
                                line: lineaOpcionalFormaNegociacion
                            });
                            objRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                fieldId: 'custrecord_l54_opcionales_trans_opcional',
                                value: parametroTipoOpcionalFormaNegociacion,
                                line: lineaOpcionalFormaNegociacion
                            });
                        }
                    }
                }

                log.debug(proceso, 'FIN - beforeSubmit - recType: ' + recType);
            }

        } catch (e) {
            log.error(proceso, 'Function beforeSubmit: ' + e.message);
        }

    }

    function consultaDatosImpositivos(idSubsidiaria, isOneWorld) {

        try {
            var filtrosDatosImp = new Array();

            if (isOneWorld && !utilidades.isEmpty(idSubsidiaria)) {
                var filtroSubsidiaria = new Object();
                filtroSubsidiaria.name = 'custrecord_l54_subsidiaria';
                filtroSubsidiaria.operator = 'IS';
                filtroSubsidiaria.values = idSubsidiaria;
                filtrosDatosImp.push(filtroSubsidiaria);
            }

            var searchDatosImp = utilidades.searchSavedPro('customsearch_l54_datos_impos_empresa', filtrosDatosImp);

            if (!searchDatosImp.error && !utilidades.isEmpty(searchDatosImp.objRsponseFunction.result) && searchDatosImp.objRsponseFunction.result.length > 0) {

                var datosImpResultSet = searchDatosImp.objRsponseFunction.result;
                var datosImpResultSearch = searchDatosImp.objRsponseFunction.search;

                log.debug('consultaDatosImpositivos', 'datosImpResultSet.length: ' + datosImpResultSet.length);

                if (!utilidades.isEmpty(datosImpResultSet) && datosImpResultSet.length > 0) {
                    var datosImp_emisorCBU = datosImpResultSet[0].getValue({
                        name: datosImpResultSearch.columns[2]
                    });
                }
                //log.debug('consultaDatosImpositivos', 'datosImp_emisorCBU: ' + datosImp_emisorCBU);

                return datosImp_emisorCBU;
            }

        } catch (e) {
            log.error('consultaDatosImpositivos', 'Exception: ' + e.message);
        }
    }

    function handlerCBUEmisorFCE_afterSubmit(scriptContext) {

        var proceso = 'afterSubmit';

        try {
            //INVOCO A LA FUNCION
            var recId = scriptContext.newRecord.id;
            var recType = scriptContext.newRecord.type;

            if (scriptContext.type != 'view' && scriptContext.type != 'delete' && runtime.executionContext == 'CSVIMPORT') {
                log.debug(proceso, 'INICIO - afterSubmit - recType: ' + recType);

                var objRecord = record.load({
                    type: recType,
                    id: recId,
                    isDynamic: false,
                });

                // log.debug(proceso, 'objRecord.getSublists(): ' + JSON.stringify(objRecord.getSublists()));

                var emisorCBU = '';
                var cbuEmisor = objRecord.getValue({ fieldId: 'custbody_l54_cbu_emisor' });
                var esCredElectronico = objRecord.getValue({ fieldId: 'custbody_l54_es_credito_electronico' });
                var esNotaDebito = objRecord.getValue({ fieldId: 'custbody_l54_nd' });
                var formaNegociacion = objRecord.getValue({ fieldId: 'custbody_l54_forma_negociacion' });

                if (!utilidades.isEmpty(formaNegociacion)) {
                    var textFormaNegociacion = search.lookupFields({
                        type: 'customlist_l54_listado_formas_negociac',
                        id: formaNegociacion,
                        columns: 'name'
                    });
                }

                var isOneWorld = utilidades.l54esOneworld();

                log.debug(proceso, 'isOneWorld: ' + isOneWorld + ', cbuEmisor: ' + cbuEmisor + ', esCredElectronico: ' + esCredElectronico + ', esNotaDebito: ' + esNotaDebito + ', formaNegociacion: ' + formaNegociacion + ', textFormaNegociacion: ' + JSON.stringify(textFormaNegociacion));

                if (esCredElectronico && utilidades.isEmpty(cbuEmisor) && !esNotaDebito) {
                    var idSubsidiaria = '';
                    if (isOneWorld) {
                        idSubsidiaria = objRecord.getValue({ fieldId: 'subsidiary' });
                    }
                    emisorCBU = consultaDatosImpositivos(idSubsidiaria, isOneWorld);
                    log.debug(proceso, 'emisorCBU: ' + emisorCBU);

                    objRecord.setValue({ fieldId: 'custbody_l54_cbu_emisor', value: emisorCBU });
                }

                if (scriptContext.newRecord.type == 'invoice' && !esNotaDebito && esCredElectronico && runtime.executionContext == 'CSVIMPORT') {

                    var currScript = runtime.getCurrentScript();
                    var parametroTipoDato = currScript.getParameter('custscript_l54_argentina_st_cbu_emisor');
                    var parametroTipoOpcionalFormaNegociacion = currScript.getParameter('custscript_l54_argentina_st_forma_neg');
                    var parametroFormaNegociacionNoAplica = currScript.getParameter('custscript_l54_argentina_st_neg_no_aplic');

                    log.debug(proceso, 'parametroTipoDato: ' + parametroTipoDato + ' - parametroTipoOpcionalFormaNegociacion: ' + parametroTipoOpcionalFormaNegociacion + ' - parametroFormaNegociacionNoAplica: ' + parametroFormaNegociacionNoAplica);

                    if (utilidades.isEmpty(emisorCBU) && !utilidades.isEmpty(cbuEmisor)) {
                        emisorCBU = cbuEmisor;
                    }

                    if (!utilidades.isEmpty(parametroTipoDato) && !utilidades.isEmpty(emisorCBU)) {

                        var lineaOpcional = objRecord.getLineCount({
                            sublistId: 'recmachcustrecord_l54_opcionales_trans_transac'
                        });

                        log.debug(proceso, 'lineaOpcional: ' + lineaOpcional + ' - runtime.executionContext: ' + runtime.executionContext);

                        var cbuEmisorExistente = false;
                        var existeOpcionalFormaNegociacion = false;
                        var arrayOpcionales = [];
                        arrayOpcionales.push(parametroTipoDato, parametroTipoOpcionalFormaNegociacion);
                        var arrayInformacionOpcionales = getCodigosOpcionales(arrayOpcionales);

                        if (!utilidades.isEmpty(lineaOpcional) && lineaOpcional > 0 && runtime.executionContext == 'CSVIMPORT') {
                            for (var i = 0; i < lineaOpcional; i++) {
                                var opcional = objRecord.getSublistValue({ sublistId: 'recmachcustrecord_l54_opcionales_trans_transac', fieldId: 'custrecord_l54_opcionales_trans_opcional', line: i });

                                //Si en la sublista ya se encuentra la línea para el CBU Emisor, se actualiza el Valor
                                if (opcional == parametroTipoDato) {
                                    log.debug(proceso, 'LINE 134 - opcional: ' + opcional);
                                    objRecord.setSublistValue({
                                        sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                        fieldId: 'custrecord_l54_opcionales_trans_val_opc',
                                        value: emisorCBU,
                                        line: i
                                    });
                                    cbuEmisorExistente = true;
                                } else {
                                    //Si en la sublista ya se encuentra la línea para el opcional Forma de Negociación, se actualiza el Valor
                                    if (opcional == parametroTipoOpcionalFormaNegociacion && formaNegociacion != parametroFormaNegociacionNoAplica) {
                                        log.debug(proceso, 'LINE 146 - opcional: ' + opcional);
                                        objRecord.setSublistValue({
                                            sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                            fieldId: 'custrecord_l54_opcionales_trans_val_opc',
                                            value: textFormaNegociacion.name,
                                            line: i
                                        });
                                        existeOpcionalFormaNegociacion = true;
                                    }
                                }
                            }
                        }

                        log.debug(proceso, 'cbuEmisorExistente: ' + cbuEmisorExistente);

                        var lineaOpcionalFormaNegociacion = lineaOpcional;
                        //Si en la sublista no se encuentra la línea para el CBU Emisor, se agrega
                        if (runtime.executionContext == 'CSVIMPORT' && lineaOpcionalFormaNegociacion >= 0 && !cbuEmisorExistente) {

                            var informacionOpcionalCBU = arrayInformacionOpcionales.filter(function (obj) {
                                return (obj.idInterno === parametroTipoDato);
                            });

                            log.debug(proceso, 'informacionOpcionalCBU: ' + JSON.stringify(informacionOpcionalCBU));

                            objRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                fieldId: 'custrecord_l54_opcionales_trans_val_opc',
                                value: emisorCBU,
                                line: lineaOpcionalFormaNegociacion
                            });

                            objRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                fieldId: 'custrecord_l54_opcionales_trans_opcional',
                                value: parametroTipoDato,
                                line: lineaOpcionalFormaNegociacion
                            });

                            if (!utilidades.isEmpty(informacionOpcionalCBU) && informacionOpcionalCBU.length > 0 && !utilidades.isEmpty(informacionOpcionalCBU[0].codigoAFIP)) {
                                objRecord.setSublistValue({
                                    sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                    fieldId: 'custrecord_l54_opcionales_trans_cod_opc',
                                    value: informacionOpcionalCBU[0].codigoAFIP,
                                    line: lineaOpcionalFormaNegociacion
                                });
                            }
                            lineaOpcionalFormaNegociacion += 1;
                        }

                        log.debug(proceso, 'lineaOpcionalFormaNegociacion: ' + lineaOpcionalFormaNegociacion);

                        //Si en la sublista no se encuentra la línea para el CBU Emisor, se agrega
                        if (runtime.executionContext == 'CSVIMPORT' && lineaOpcionalFormaNegociacion >= 0 && !existeOpcionalFormaNegociacion && formaNegociacion != parametroFormaNegociacionNoAplica) {

                            var informacionOpcionalFormaNeg = arrayInformacionOpcionales.filter(function (obj) {
                                return (obj.idInterno === parametroTipoOpcionalFormaNegociacion);
                            });

                            log.debug(proceso, 'informacionOpcionalFormaNeg: ' + JSON.stringify(informacionOpcionalFormaNeg));

                            objRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                fieldId: 'custrecord_l54_opcionales_trans_val_opc',
                                value: textFormaNegociacion.name,
                                line: lineaOpcionalFormaNegociacion
                            });

                            objRecord.setSublistValue({
                                sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                fieldId: 'custrecord_l54_opcionales_trans_opcional',
                                value: parametroTipoOpcionalFormaNegociacion,
                                line: lineaOpcionalFormaNegociacion
                            });

                            if (!utilidades.isEmpty(informacionOpcionalFormaNeg) && informacionOpcionalFormaNeg.length > 0 && !utilidades.isEmpty(informacionOpcionalFormaNeg[0].codigoAFIP)) {
                                objRecord.setSublistValue({
                                    sublistId: 'recmachcustrecord_l54_opcionales_trans_transac',
                                    fieldId: 'custrecord_l54_opcionales_trans_cod_opc',
                                    value: informacionOpcionalFormaNeg[0].codigoAFIP,
                                    line: lineaOpcionalFormaNegociacion
                                });
                            }
                        }

                        objRecord.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: false
                        });
                    }
                }
                log.debug(proceso, 'FIN - AFTERSUBMIT ' + scriptContext.type);

            }
        } catch (err) {
            log.error(proceso, 'Exception After Submit - Detalles: ' + err.message);
        }
    }

    function getCodigosOpcionales(arrayOpcionales) {

        var proceso = 'getCodigosOpcionales';

        try {
            var arrayInfoOpcionales = [];
            var filtros = new Array();

            if (!utilidades.isEmpty(arrayOpcionales)) {
                var filtro1 = {};
                filtro1.name = 'internalid';
                filtro1.operator = 'ANYOF';
                filtro1.values = arrayOpcionales;
                filtros.push(filtro1);
            }

            var searchCodigosOpcionales = utilidades.searchSavedPro('customsearch_l54_obt_codig_opcionales', filtros);

            if (!searchCodigosOpcionales.error && !utilidades.isEmpty(searchCodigosOpcionales.objRsponseFunction.result) && searchCodigosOpcionales.objRsponseFunction.result.length > 0) {

                var resultSet = searchCodigosOpcionales.objRsponseFunction.result;
                var resultSearch = searchCodigosOpcionales.objRsponseFunction.search;

                log.debug(proceso, 'resultSet.length: ' + resultSet.length);

                if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
                    for (var i = 0; i < resultSet.length; i++) {
                        var infoResult = {};
                        infoResult.idInterno = resultSet[i].getValue({ name: resultSearch.columns[0] });
                        infoResult.name = resultSet[i].getValue({ name: resultSearch.columns[1] });
                        infoResult.codigoAFIP = resultSet[i].getValue({ name: resultSearch.columns[2] });
                        arrayInfoOpcionales.push(infoResult);
                    }
                }
            }
        } catch (err) {
            log.error(proceso, 'Error NetSuite Excepción - getCodigosOpcionales - Detalles: ' + err.message);
        }
        return arrayInfoOpcionales;
    }

    /** L54 - Validar Cliente FCE (Servidor) **/
    function handlerValidarClienteFCE_beforeLoad(scriptContext) {

        const proceso = "L54 - Validar Cliente FCE";
        try {

            log.audit(proceso, "INICIO - beforeLoad");
            //log.debug(proceso, 'scriptContext.mode: ' + scriptContext.mode);
            let aplicaFCE = false;
            let objRecord = scriptContext.newRecord;
            let isOneWorld = runtime.isFeatureInEffect({feature: 'SUBSIDIARIES'});
            let subsidiaria = null;
            if(isOneWorld){
                subsidiaria = objRecord.getValue({ fieldId: "subsidiary" });
            } 
            let clienteID = objRecord.getValue({ fieldId: "entity" });
            let formularioFC = objRecord.getValue({ fieldId: "customform" });
            let confFormularioMIPYME = getConfiguracionMIPYME(proceso,subsidiaria);
            if (!utilidades.isEmpty(clienteID)) {
                let fieldLookUp = search.lookupFields({
                    type: "customer",
                    id: clienteID,
                    columns: ["custentity_l54_aplica_fce"]
                });
                if (!utilidades.isEmpty(fieldLookUp)) {
                    aplicaFCE = fieldLookUp.custentity_l54_aplica_fce;
                }
            }
            log.debug(proceso, "aplicaFCE: " + aplicaFCE);
            log.debug(proceso, "subsidiaria: " + subsidiaria);
            
            if (aplicaFCE) {
                log.debug(proceso, "Inicio - Cliente SI aplica FCE");
                
                let importeFC = Number(objRecord.getValue({ fieldId: "total" }));
                let tipoCambioFC = objRecord.getValue({ fieldId: "exchangerate" });
                let creadoDesde = objRecord.getValue({ fieldId: "createdfrom" });
                let esCredElectronico = objRecord.getValue({ fieldId: "custbody_l54_es_credito_electronico" });
                let esNotaDebito = objRecord.getValue({ fieldId: "custbody_l54_nd" });

                
                //! Execute Calculate Tax
                let cantidadTaxDetails = objRecord.getLineCount("taxdetails");
                log.audit("cantidadTaxDetails=" + cantidadTaxDetails);
                if (cantidadTaxDetails == 0 && importeFC > 0) {
                    objRecord.executeMacro({
                        "id": "calculateTax",
                        "package": "",
                        "params": { asyncCalculation: false }
                    });
                }
                
                let importeTotal = ((importeFC) * tipoCambioFC).toFixed(2);


                log.debug(proceso, "importeFC: " + importeFC + " - tipoCambioFC: " + tipoCambioFC + " - importeTotal: " + importeTotal + " - esNotaDebito: " + esNotaDebito);
                
                log.debug(proceso, "paramFormularioFCE: " + confFormularioMIPYME.formularioFCE + " - paramImporte: " + confFormularioMIPYME.importeFCE + ", paramFormularioND: " + confFormularioMIPYME.formularioNDE + " - paramFormularioLocal: "+ confFormularioMIPYME.formularioFLocal);
                log.debug(proceso, "creadoDesde: " + creadoDesde + " - esCredElectronico: " + esCredElectronico);
                if (formularioFC != confFormularioMIPYME.formularioFCE  && !utilidades.isEmpty(clienteID) && !esNotaDebito) {
                    log.debug(proceso, "La Factura se está creando desde el Cliente, se cambia al formulario FCE.");
                    //! objRecord o scriptContext.currentRecord
                    objRecord.setValue({ fieldId: "customform", value: confFormularioMIPYME.formularioFCE });
                }
                if (formularioFC != confFormularioMIPYME.formularioFCE && importeTotal >= confFormularioMIPYME.importeFCE) {
                    if (scriptContext.mode == "create" || scriptContext.mode == "copy" && !esNotaDebito) {
                        log.debug(proceso, "Creación - El importe es mayor o igual al Importe del parámetro, se cambia al formulario FCE.");
                        objRecord.setValue({ fieldId: "customform", value: confFormularioMIPYME.formularioFCE });
                    }
                    if (scriptContext.mode == "edit") {
                        log.debug(proceso, "Edición - El importe es mayor o igual al Importe del parámetro, se cambia al formulario FCE.");
                        objRecord.setValue({ fieldId: "customform", value: confFormularioMIPYME.formularioFCE });
                    }
                }
                if (formularioFC == confFormularioMIPYME.formularioFCE || formularioFC == confFormularioMIPYME.formularioNDE) {
                    if (!esCredElectronico) {
                        log.debug(proceso, "Marcar campo Es Crédito Electrónico?.");
                        objRecord.setValue({ fieldId: "custbody_l54_es_credito_electronico", value: true });
                    }
                } else {
                    if (esCredElectronico) {
                        log.debug(proceso, "Desmarcar campo Es Crédito Electrónico?.");
                        objRecord.setValue({ fieldId: "custbody_l54_es_credito_electronico", value: false });
                    }
                }
                log.debug(proceso, "Fin - Cliente SI aplica FCE");
            }

            //!Blanqueamiento de Sublista
            let formFCE = !utilidades.isEmpty(confFormularioMIPYME) ? confFormularioMIPYME.formularioFCE : undefined;
            if (formularioFC != formFCE) {
                let sublistaOpcional = "recmachcustrecord_l54_opcionales_trans_transac";
                let lineasOpcionales = objRecord.getLineCount({ sublistId: sublistaOpcional });
                log.debug(proceso, "lineasOpcionales: " + lineasOpcionales);
                if (!utilidades.isEmpty(lineasOpcionales) && lineasOpcionales > 0) {
                    log.audit(proceso, "INICIO - Blanquear Sublista L54 - Opcionales Transacción");
                    for (let i = lineasOpcionales; i > 0; i--) {
                        //log.debug(proceso, 'Removiendo linea - i: ' + i);
                        objRecord.removeLine({ sublistId: sublistaOpcional, line: 0 });
                    }
                    lineasOpcionales = objRecord.getLineCount({ sublistId: sublistaOpcional });
                    log.audit(proceso, "FIN - Blanquear Sublista L54 - Opcionales Transacción");
                }
            }

            log.audit(proceso, "FIN - beforeLoad");
        } catch (error) {
            log.error(proceso, "LINE 51 - Error NetSuite Excepción - detalles: " + error.message);
        }
    }

    function handlerValidarClienteFCE_beforeSubmit(scriptContext) { 

        const proceso = "L54 - Validar Cliente FCE";
        try {
            /*if (scriptContext.type == scriptContext.UserEventType.CREATE || scriptContext.type == scriptContext.UserEventType.EDIT) {
                LIBValidarClienteFCE.saveRecord(objRecord,true)
            }*/
            log.audit(proceso, "INICIO - beforeSubmit");
                let aplicaFCE = false;
                let objRecord = scriptContext.newRecord;
                let isOneWorld = runtime.isFeatureInEffect({feature: 'SUBSIDIARIES'});
                let subsidiaria = null;
                if(isOneWorld){
                    subsidiaria = objRecord.getValue({ fieldId: "subsidiary" });
                } 
                let clienteID = objRecord.getValue({ fieldId: "entity" });
                if (!utilidades.isEmpty(clienteID)) {
                    let fieldLookUp = search.lookupFields({
                        type: "customer",
                        id: clienteID,
                        columns: ["custentity_l54_aplica_fce"]
                    });
                    if (!utilidades.isEmpty(fieldLookUp)) {
                        aplicaFCE = fieldLookUp.custentity_l54_aplica_fce;
                    }
                }
                log.debug(proceso, "aplicaFCE: " + aplicaFCE);
                log.debug(proceso, "subsidiaria: " + subsidiaria);
                if (aplicaFCE) {
                    log.debug(proceso, "Inicio - Cliente SI aplica FCE");
                    let importeFC = Number(objRecord.getValue({ fieldId: "total" }));
                    let tipoCambioFC = objRecord.getValue({ fieldId: "exchangerate" });
                    let esNotaDebito = objRecord.getValue({ fieldId: "custbody_l54_nd" });
                    let esCredElectronico = objRecord.getValue({ fieldId: "custbody_l54_es_credito_electronico" });

                    // no se puede llamar al macro de calcular impuestos en saveRecord, se rompe.
                    let importeTotal = ((importeFC) * tipoCambioFC).toFixed(2);

                    log.debug(proceso, "importeFC: " + importeFC + " - tipoCambioFC: " + tipoCambioFC + " - importeTotal: " + importeTotal + " - esNotaDebito: " + esNotaDebito);
                    let formularioFC = objRecord.getValue({ fieldId: "customform" });
                    let confFormularioMIPYME = getConfiguracionMIPYME(proceso,subsidiaria);
                    log.debug(proceso, "paramImporte: " + confFormularioMIPYME.importeFCE + ", formularioFC: " + formularioFC + ", paramFormulario: " + confFormularioMIPYME.formularioFCE + ", paramFormularioND: " + confFormularioMIPYME.formularioNDE);
                    if (formularioFC != confFormularioMIPYME.formularioFCE && importeTotal >= confFormularioMIPYME.importeFCE && !esNotaDebito) {
                        log.debug(proceso, "El formulario no es FCE y el importe de la factura es mayor o igual al Importe del parámetro.");
                        log.error("Error de formulario: Se debe informar a AFIP con formulario de Factura de Crédito Electrónica - MiPyme");
                        objRecord.setValue({ fieldId: "customform", value: confFormularioMIPYME.formularioFCE });
                    }
                    let cantidadTaxDetails = objRecord.getLineCount("taxdetails");
                    log.audit("cantidadTaxDetails=" + cantidadTaxDetails);
                    /*if (formularioFC == confFormularioMIPYME.formularioFCE && cantidadTaxDetails == 0) {
                        alert_msg("El cliente cumple con todos los requisitos para transacciones mipyme, pero la transaccion no posee calculado los impuestos, por favor presione el boton de vista previa de impuestos, para validar si la transacción alcanza el importe mínimo para transacciones mipyme.");
                        return false;
                    }*/
                    if (formularioFC == confFormularioMIPYME.formularioFCE && importeTotal < confFormularioMIPYME.importeFCE && !esNotaDebito) {
                        log.debug(proceso, "El formulario es FCE y el importe de la factura es menor al Importe del parámetro.");
                        log.error("Error de formulario: Se debe informar a AFIP con formulario de Factura de venta ARG - No llega al valor mínimo para ser Factura de Crédito Electrónica - MiPyme");
                        objRecord.setValue({ fieldId: "customform", value: confFormularioMIPYME.formularioFLocal });
                    }
                    if(!esNotaDebito){
                        if(importeTotal >= confFormularioMIPYME.importeFCE){
                            if (!esCredElectronico) {
                                log.debug(proceso, "Marcar campo Es Crédito Electrónico?.");
                                objRecord.setValue({ fieldId: "custbody_l54_es_credito_electronico", value: true });
                            }
                        }else{
                            if (esCredElectronico) {
                                log.debug(proceso, "Desmarcar campo Es Crédito Electrónico?.");
                                objRecord.setValue({ fieldId: "custbody_l54_es_credito_electronico", value: false });
                            }
                        }
                    }
                    /*if (formularioFC != confFormularioMIPYME.formularioNDE && esNotaDebito ) {
                        log.debug(proceso, "El formulario no es Nota de Débito FCE y el check de Es ND y Es Crédito Electrónico se encuentra marcado.");
                        log.error("Error de formulario: Se debe informar a AFIP con formulario de Nota de Débito Electrónica");
                        objRecord.setValue({ fieldId: "customform", value: confFormularioMIPYME.formularioNDE });
                    }*/
                    log.debug(proceso, "Fin - Cliente SI aplica FCE");
                }
                log.audit(proceso, "FIN - beforeSubmit");
                return true;
 
        } catch (error) {
            log.error(proceso, "LINE 41 - Error NetSuite Excepción - Detalles: " + error.message);
            log.error(proceso, JSON.stringify(error));
        }
    }
    function getConfiguracionMIPYME(proceso, subsidiaria) {
        let funcion = proceso + " getConfiguracionMIPYME";
        log.debug(funcion, "VALOR RECIBIDO subsidiaria=" + subsidiaria);
        let objRta = {
            formularioFCE: "",
            importeFCE: "",
            formularioNDE: "",
            formularioFLocal: ""
        };
        const filtros = [
            { name: "isinactive", operator: "IS", values: false },
        ];
        if(!utilidades.isEmpty(subsidiaria)){
            filtros.push({ name: "custrecord_l54_conf_MIPYME_subsidiaria", operator: "ANYOF", values: subsidiaria })
        }
        const columnas = [
            "custrecord_l54_conf_mipyme_fce_form",
            "custrecord_l54_conf_mipyme_fce_imp",
            "custrecord_l54_conf_mipyme_nde_form",
            "custrecord_l54_conf_mipyme_flocal_form"
        ];
        const resultSet = search.create({
            type: "customrecord_l54_conf_formulario_MIPYME",
            filters: filtros,
            columns: columnas
        }).run().getRange({ start: 0, end: 1 });
        if (!utilidades.isEmpty(resultSet) && resultSet.length > 0) {
            objRta.formularioFCE = resultSet[0].getValue({ name: columnas[0] });
            objRta.importeFCE = resultSet[0].getValue({ name: columnas[1] });
            objRta.formularioNDE = resultSet[0].getValue({ name: columnas[2] });
            objRta.formularioFLocal = resultSet[0].getValue({name: columnas[3]});
            // castear a numero, importante!
            objRta.importeFCE = Number(objRta.importeFCE);
        } else {
            log.error(funcion, "no hay resultados");
        }
        log.debug(funcion, "RETURN objRta= " + JSON.stringify(objRta));
        return objRta;
    }
    return {beforeLoad, beforeSubmit, afterSubmit}

});
