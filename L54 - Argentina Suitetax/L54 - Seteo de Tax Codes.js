/**
 * @format
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(["N/record"], function (record) {
    /* global define log */
    /* eslint-disable quotes */
    /**
    * @param {UserEventContext.afterSubmit} context
    */
    const afterSubmit = (context) => {

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

                // log.debug(proceso, `INICIO - afterSubmit / id interno: ${context.newRecord.id} / type: ${context.newRecord.type}`);

                

                // const taxDetailsQuantity = objRecord.getLineCount({
                //     sublistId: "taxdetails"
                // });

                // const arrayTaxDetails = [];
                // const arrayTaxCodes = [];

                // // Obtencion de taxCodes por taxDetails
                // for (let i = 0; i < taxDetailsQuantity; i++) {
                //     const infoTaxDetail = {};
                //     infoTaxDetail.taxDetailReference = objRecord.getSublistValue("taxdetails", "taxdetailsreference", i);
                //     infoTaxDetail.taxCode = objRecord.getSublistValue("taxdetails", "taxcode", i);
                //     infoTaxDetail.taxRate = objRecord.getSublistValue("taxdetails", "taxrate", i);
                //     arrayTaxCodes.push(infoTaxDetail.taxCode);
                //     arrayTaxDetails.push(infoTaxDetail);
                // }

                // log.debug(proceso, `arrayTaxDetails: ${JSON.stringify(arrayTaxDetails)}`);
                // log.debug(proceso, `arrayTaxCodes: ${JSON.stringify(arrayTaxCodes)}`);

                // setearColumnasConTaxDetails("item", objRecord, arrayTaxDetails, taxDetailsQuantity);
                // setearColumnasConTaxDetails("expense", objRecord, arrayTaxDetails, taxDetailsQuantity);

                desaplicarYAplicarNC(context.newRecord.type, objRecord);

                objRecord.save();

                //log.debug(proceso, `FIN - afterSubmit / id interno: ${idRec} / type: ${context.newRecord.type}`);
            }
        } catch (error) {
            log.error(proceso, `Error NetSuite Excepcion - detalles: ${error.message}`);
        }
    };

    /**
     * 
     * @param {"item" | "expense"} tipoLista 
     * @param {*} objRecord 
     * @param {*} arrayTaxDetails 
     */
    function setearColumnasConTaxDetails(tipoLista, objRecord, arrayTaxDetails, taxDetailsQuantity) {
        const proceso = "setearColumnasConTaxDetails";
        log.debug(proceso + " entrar", tipoLista);
        // Obtencion de taxCodes por items
        if (arrayTaxDetails.length > 0) {
            const listaQuantity = objRecord.getLineCount({
                sublistId: tipoLista
            });

            log.debug(proceso, `${tipoLista}Quantity: ${listaQuantity} / taxDetailsQuantity: ${taxDetailsQuantity}`);

            for (let i = 0; i < listaQuantity; i++) {

                const taxDetailReferenceItem = objRecord.getSublistValue(tipoLista, "taxdetailsreference", i);
                const itemInGroup = objRecord.getSublistValue(tipoLista, "ingroup", i);
                const taxCodeItemResult = arrayTaxDetails.filter(obj => { return (obj.taxDetailReference == taxDetailReferenceItem); });
                const itemType = objRecord.getSublistValue(tipoLista, "itemtype", i);

                log.debug(proceso, `line nro: ${i} / taxCodeItemResult: ${JSON.stringify(taxCodeItemResult)} / itemType: ${itemType} / itemInGroup: ${itemInGroup}`);

                if (!isEmpty(taxCodeItemResult) && taxCodeItemResult.length > 0) {

                    objRecord.setSublistValue(tipoLista, "custcol_l54_codigo_impuesto", i, taxCodeItemResult[0].taxCode);
                    objRecord.setSublistValue(tipoLista, "custcol_l54_tasa_impuesto", i, taxCodeItemResult[0].taxRate);

                    if (!isEmpty(itemInGroup) && (itemInGroup == "T" || itemInGroup == true)) {

                        const beforeLine = i - 1;
                        const itemTypeItemBefore = objRecord.getSublistValue(tipoLista, "itemtype", beforeLine);
                        log.debug(proceso, `beforeLine: ${beforeLine} / itemTypeItemBefore: ${itemTypeItemBefore}`);

                        if (itemTypeItemBefore == "Group") {
                            objRecord.setSublistValue(tipoLista, "custcol_l54_codigo_impuesto", beforeLine, taxCodeItemResult[0].taxCode);
                            objRecord.setSublistValue(tipoLista, "custcol_l54_tasa_impuesto", beforeLine, taxCodeItemResult[0].taxRate);
                        }
                    }
                } else if (itemType == "Discount" && i > 0) {
                    // Verificacion de si es mayor a la primera posicion para verificar si es descuento.
                    // Esto se realiza porque el descuento no se refleja en el tax details.

                    const taxCodeLineItemBefore = objRecord.getSublistValue(tipoLista, "custcol_l54_codigo_impuesto", i - 1);
                    const taxRateLineItemBefore = objRecord.getSublistValue(tipoLista, "custcol_l54_tasa_impuesto", i - 1);

                    objRecord.setSublistValue(tipoLista, "custcol_l54_codigo_impuesto", i, taxCodeLineItemBefore);
                    objRecord.setSublistValue(tipoLista, "custcol_l54_tasa_impuesto", i, taxRateLineItemBefore);

                } else {
                    log.error(proceso, `No se encuentra resultado de tax reference y tax code en la linea de articulos nro: ${i} / taxDetailsReference: ${taxDetailReferenceItem}, verifique por favor.`);
                }
            }

            for (let i = 0; i < listaQuantity; i++) {
                log.debug(proceso, `indice: ${i} / codigo impuesto: ${objRecord.getSublistValue(tipoLista, "custcol_l54_codigo_impuesto", i)} / tasa: ${objRecord.getSublistValue(tipoLista, "custcol_l54_tasa_impuesto", i)}`);
            }
        } else {
            log.error(proceso, `No se encuentra resultado de tax details en la transaccion, verifique por favor.`);
        }

    }

    function isEmpty(val) {
        return val === "" || val === undefined || val === "undefined" || val === null || val === "null" || (val.length === 0) || (typeof val == "object" && Object.keys(val).length === 0);
    }

    // ! NO ELIMINAR FUNCION
    function beforeSubmit() {
        // si no existo, no ando c:
        log.audit("beforeSubmit", "ingreso beforeSubmit NO ELIMINAR");
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

    return {
        afterSubmit: afterSubmit,
        beforeSubmit: beforeSubmit
    };
});
