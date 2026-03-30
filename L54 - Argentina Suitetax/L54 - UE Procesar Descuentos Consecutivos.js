/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(["N/record", "N/error", "N/search", "N/task", "N/runtime", "L54/utilidades"],
    function (record, error, search, task, runtime, utilidades) {

         /**
        * Function definition to be triggered before record is submit.
        *
        * @param {Object} scriptscriptContext
        * @param {Record} scriptscriptContext.newRecord - New record
        * @param {Record} scriptscriptContext.oldRecord - Old record
        * @param {string} scriptscriptContext.type - Trigger type
        * @Since 2015.2
        */

        const beforeSubmit = (scriptContext) => {

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

        // function parseLatamNumber(valor) {

        //     if (valor === null || valor === undefined) return NaN;

        //     // Convertir SIEMPRE a string
        //     let str = valor.toString();

        //     return parseFloat(
        //         str
        //             .replace(/\./g, '')   // quita separadores de miles
        //             .replace(',', '.')    // convierte coma en decimal
        //     );
        // }

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

        function createError(nameError, mensajeError, notify) {

            throw (error.create({
                name: nameError,
                message: mensajeError,
                notifyOff: notify
            })
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

        return {
            beforeSubmit: beforeSubmit
        };
    });