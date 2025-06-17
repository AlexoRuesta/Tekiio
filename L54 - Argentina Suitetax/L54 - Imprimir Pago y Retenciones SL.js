/**
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define(["N/search", "N/record", "N/config", "N/render", "N/file"],

  function (search, record, config, render, file) {
    /*global define log */
    // migrado desde L54 - Imprimir Pago y Retenciones Proveedor.js

    function isEmpty(value) {

      return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
    }


    function onRequest(context) {

      log.audit("onRequest context.request.parameters values:", JSON.stringify(context.request.parameters));

      try {
        const idPago = context.request.parameters.idPago;
        const tipoPago = context.request.parameters.tipoPago;
        log.debug("imprimirPago_suitelet", "INICIO - ID Interno Pago : " + idPago + ",tipoPago:" + tipoPago);
        //Dependiendo el tipo de reporte se carga el template correspondiente:
        let campo;
        let campoCarpetaPDF = "custrecord_pagprv_panel_id_pdf_pag";
        let pdfFileName;
        let idSavedSearchFacturas = "customsearch_l54_pag_y_ret";
        let tipoSavedSearchFacturas = "transaction";
        let idFiltroFacturas = "internalid";
        let idFiltroFacturasAdicional = "internalid";
        let idJoin = "payingtransaction";
        let idSavedSearchRetenciones = "customsearch_l54_retenciones";
        let tipoSavedSearchRetenciones = "customrecord_l54_retencion";
        let idFiltroRetenciones = "internalid";
        const idFiltroRetenciones2 = "isdefaultbilling";
        const idjoinRetenciones = "custrecord_l54_ret_ref_pago_prov";
        const idjoinRetenciones2 = "custrecord_l54_ret_ref_proveedor";
        let tipoRecord = "vendorpayment";
        let filtroPanelConf = "custrecord_l54_pagprv_panel_subsidiaria";
        let recordPanelConf = "customrecord_l54_pagoprov_mas_panelctrl";
        let guardarPDF = false;
        let campoPDF = "";
        let campoPDFPagoYRet = "";

        const subsidiariaParametrizada = context.request.parameters.subsidiaria;
        const impresionMasiva = context.request.parameters.impresionMasiva;
        const enviarPagoyRetencion = context.request.parameters.enviarPagoyRetencion;


        try {
          log.debug("imprimirPago_suitelet", "#49 subsidiariaParametrizada: " + subsidiariaParametrizada);

          if (!isEmpty(subsidiariaParametrizada)) {
            var recSubsidiary = record.load({
              type: record.Type.SUBSIDIARY,
              id: subsidiariaParametrizada,
              isDynamic: true,
            });
            var filtroLogo = new Array();
            filtroLogo[0] = search.createFilter({
              name: "internalid",
              operator: search.Operator.IS,
              values: recSubsidiary.getValue("logo") //logo
            });
            log.debug("imprimirPago_suitelet", "#63 filtroLogo " + JSON.stringify(filtroLogo));
            var columns = new Array();
            columns[0] = search.createColumn({
              name: "internalid"
            });

            columns[1] = search.createColumn({
              name: "url"
            });

            var recLogo = search.create({
              type: "file",
              filters: filtroLogo,
              columns: columns
            }).run().getRange({
              start: 0,
              end: 1000
            });
          } else {

            const companyInfo = config.load({
              type: config.Type.COMPANY_INFORMATION
            });

            /*recSubsidiary.legalname = companyInfo.getValue("legalname");
            recSubsidiary.federalidnumber = companyInfo.getValue("employerid");
            recSubsidiary.mainaddress_text = companyInfo.getValue("mainaddress_text");*/

            recSubsidiary = record.load({
              type: record.Type.VENDOR_PAYMENT,
              id: idPago,
              isDynamic: true,
            });
            recSubsidiary.setValue("address", companyInfo.getValue("mainaddress_text"));
            recSubsidiary.setValue("custbody_54_cuit_entity", companyInfo.getValue("employerid"));
            recSubsidiary.setValue("custbody_l54_razon_social_prov", companyInfo.getValue("legalname"));

            filtroLogo = new Array();
            filtroLogo[0] = search.createFilter({
              name: "internalid",
              operator: search.Operator.IS,
              values: companyInfo.getValue("formlogo")
            });
            log.audit("imprimirPago_suitelet", "#106 filtroLogo " + JSON.stringify(filtroLogo));
            columns = new Array();
            columns[0] = search.createColumn({
              name: "internalid"
            });
            columns[1] = search.createColumn({
              name: "url"
            });
            recLogo = search.create({
              type: "file",
              filters: filtroLogo,
              columns: columns
            }).run().getRange({
              start: 0,
              end: 1000
            });

            log.debug("imprimirPago_suitelet", "companyinformation: " + recSubsidiary.getValue("custbody_54_cuit_entity"));
          }
        } catch (e) {
          log.debug("imprimirPago_suitelet", "#126: facturasPagas - ERROR: " + e.message);
        }


        if (!isEmpty(context.request.parameters.guardarPago) && context.request.parameters.guardarPago == "SI") {
          guardarPDF = true;
        }

        log.debug("imprimirPago_suitelet", "#134: tipoPago:" + context.request.parameters.tipoPago);

        switch (context.request.parameters.tipoPago) {
          case "VENDORPAYMENT":
            campo = "custrecord_l54_pagprv_panel_id_tmpl_pag";
            campoCarpetaPDF = "custrecord_pagprv_panel_id_pdf_pag";
            pdfFileName = "PagoProveedor_" + context.request.parameters.numero + ".pdf";
            campoPDF = "custbody_l54_pdf_pago";
            break;
          case "ORDPAGO":
            campo = "custrecord_l54_op_panel_id_tmpl_o_pag";
            campoCarpetaPDF = "custrecord_l54_op_panel_id_pdf_op";
            pdfFileName = "OrdenDePago_" + context.request.parameters.numero + ".pdf";
            idSavedSearchFacturas = "customsearch_l54_det_comp_ord_pago_prov";
            tipoSavedSearchFacturas = "customrecord_l54_orden_pago_det";
            idFiltroFacturas = "custrecord_l54_orden_pago_det_op";
            idFiltroFacturasAdicional = null;
            idJoin = null;
            idSavedSearchRetenciones = "customsearch_l54_det_ret_ord_pag";
            tipoSavedSearchRetenciones = "customrecord_l54_retencion_op";
            tipoRecord = "customrecord_l54_orden_pago";
            idFiltroRetenciones = "custrecord_l54_ret_op_ref_op";
            filtroPanelConf = "custrecord_l54_op_panel_subsidiaria";
            recordPanelConf = "customrecord_l54_op_masivo_panelctrl";
            campoPDF = "custrecord_l54_orden_pago_pdf";
            break;
        }


        // Inicio Obtencion Facturas Pagas
        try {
          //idSavedSearchFacturas = JSON.stringify(idSavedSearchFacturas)
          log.debug("imprimirPago_suitelet", "#166 - Inicio de obtención de factura."); //customsearch_l54_pag_y_ret

          const resultSearchFacturas = search.load({
            id: idSavedSearchFacturas //customsearch_l54_pag_y_ret
          });

          const filtroFacturas = search.createFilter({
            name: idFiltroFacturasAdicional,
            join: idJoin,
            operator: search.Operator.IS,
            values: idPago
          });

          resultSearchFacturas.filters.push(filtroFacturas);

          const runSearchFacturas = resultSearchFacturas.run();

          var facturasPagas = runSearchFacturas.getRange({
            start: 0,
            end: 1000
          });

          log.debug("imprimirPago_suitelet", "#188: facturasPagas:" + JSON.stringify(facturasPagas));
        } catch (e) {
          log.debug("imprimirPago_suitelet", "#190: " + e.message + " trace: " + e.stack);
        }
        log.debug("imprimirPago_suitelet", "#192 - Fin Obtencion Facturas Pagas"); //customsearch_l54_pag_y_ret

        // Fin Obtencion Facturas Pagas

        try {
          // Inicio Obtencion Retenciones Generadas
          log.debug("imprimirPago_suitelet", "#198 - Inicio Obtencion Retenciones Generadas");

          const objResultRet = search.load({
            id: idSavedSearchRetenciones
          });

          let filtroRetenciones = search.createFilter({
            name: idFiltroRetenciones,
            join: idjoinRetenciones,
            operator: search.Operator.IS,
            values: idPago
          });

          objResultRet.filters.push(filtroRetenciones);

          filtroRetenciones = search.createFilter({
            name: idFiltroRetenciones2,
            join: idjoinRetenciones2,
            operator: search.Operator.IS,
            values: "T"
          });

          objResultRet.filters.push(filtroRetenciones);

          const resultRet = objResultRet.run();

          var retenciones = resultRet.getRange({
            start: 0,
            end: 1000
          });

          log.debug("imprimirPago_suitelet", "#232: retenciones" + +JSON.stringify(retenciones));
        } catch (e) {
          log.debug("imprimirPago_suitelet", "#234: " + e.message + " trace: " + e.stack);
        }
        log.audit("imprimirPago_suitelet", "Fin Obtencion Retenciones Generadas.");

        // Fin Obtencion Retenciones Generadas

        var recPagoProveedor = record.load({
          type: tipoRecord,
          id: idPago,
          isDynamic: true,
        });

        log.audit("imprimirPago_suitelet", "#246: recPagoProveedor:" + JSON.stringify(recPagoProveedor));

        var filtrodatosImpositivos = [];
        filtrodatosImpositivos.push({
          name: "isinactive",
          operator: "is",
          values: false
        });
        if (!isEmpty(subsidiariaParametrizada)) {
          const i = 0;
          filtrodatosImpositivos[1] = search.createFilter({
            name: "custrecord_l54_subsidiaria",
            operator: search.Operator.IS,
            values: subsidiariaParametrizada
          });
        }
        columns = new Array();
        columns[0] = search.createColumn({
          name: "custrecord_l54_subsidiaria"
        });
        columns[1] = search.createColumn({
          name: "custrecord_l54_resol_ret_iva"
        });
        columns[2] = search.createColumn({
          name: "custrecord_l54_resol_ret_ganancias"
        });
        columns[3] = search.createColumn({
          name: "custrecord_l54_resol_ret_iibb"
        });
        columns[4] = search.createColumn({
          name: "custrecord_l54_resol_ret_suss"
        });
        columns[5] = search.createColumn({
          name: "custrecord_l54_ancho_firma"
        });
        columns[6] = search.createColumn({
          name: "custrecord_l54_ancho_logo"
        });
        columns[7] = search.createColumn({
          name: "custrecord_l54_altura_firma"
        });
        columns[8] = search.createColumn({
          name: "custrecord_l54_altura_logo"
        });
        columns[9] = search.createColumn({
          name: "custrecord_l54_img_firma"
        });
        columns[10] = search.createColumn({
          name: "custrecord_l54_id_template"
        });
        columns[11] = search.createColumn({
          name: "custrecord_l54_id_folder"
        });
        columns[12] = search.createColumn({
          name: "custrecord_l54_op_num"
        });
        columns[13] = search.createColumn({
          name: "custrecord_l54_op_inym"
        });

        const datosImpositivos = search.create({
          type: "customrecord_l54_datos_impositivos_emp",
          filters: filtrodatosImpositivos,
          columns: columns
        }).run().getRange({
          start: 0,
          end: 1000
        });
        log.audit("imprimirPago_suitelet", "#304: datosImpositivos:" + JSON.stringify(datosImpositivos));

        // Inicio Obtener Informacion Panel de Ejecucion
        let subsidiariaDominio = "";
        if (!isEmpty(context.request.parameters.subsidiaria)) {
          subsidiariaDominio = context.request.parameters.subsidiaria;
        }

        let iCont = 0;
        const filtroConfiguracion = new Array();
        filtroConfiguracion[iCont++] = search.createFilter({
          name: "isinactive",
          operator: search.Operator.IS,
          values: "F"
        });
        if (!isEmpty(subsidiariaDominio))
          filtroConfiguracion[iCont++] = search.createFilter({
            name: filtroPanelConf,
            operator: search.Operator.IS,
            values: subsidiariaDominio
          });

        let idTemplate = "";
        let carpetaGuardarPago = "";
        if (!isEmpty(datosImpositivos)) {
          idTemplate = datosImpositivos[0].getValue("custrecord_l54_id_template");
          carpetaGuardarPago = datosImpositivos[0].getValue("custrecord_l54_id_folder");
        }

        log.audit("imprimirPago_suitelet", "#333: idTemplate:" + idTemplate + ",carpetaGuardarPago:" + carpetaGuardarPago);

        if (!isEmpty(idTemplate)) {
          log.audit("imprimirPago_suitelet", "#336: entro al if");

          const renderer = render.create();

          const fileTemplate = file.load({
            id: idTemplate
          }); //load the HTML 

          //var file = nlapiLoadFile(76987); //load the HTML file  --> Jhosep Cambio ID HTML
          log.audit("imprimirPago_suitelet", "#345: paso el loadfile");
          //log.debug("imprimirFactura_suitelet","rep:"+script.getParameter("tipoRep"));

          //Header de PDF
          //Las url tiene &, se debe limpiar esos caracteres por el &amp (Ultimo replace)

          let template = fileTemplate.getContents(); //get the contents
          template = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">" + template;
          renderer.templateContent = template;

          //renderer.setTemplate(template);

          renderer.addSearchResults({
            templateName: "resultsFacturas",
            searchResult: facturasPagas
          });
          log.audit("imprimirPago_suitelet", "#367: facturasPagas:" + JSON.stringify(facturasPagas));
          log.audit("imprimirPago_suitelet", "#368: facturasPagas.length:" + facturasPagas.length);
          let facturasPagasStr = "";
          let facturapagaAnt = "";
          for (let i = 0; i < facturasPagas.length; i++) {
            const actual = facturasPagas[i];
            log.audit("imprimirPago_suitelet", "#375 - facturasPagas.tranid:" + actual.getValue(columns[2]));
            log.audit("imprimirPago_suitelet", "#379 - facturasPaga:" + JSON.stringify(actual));
            if (actual.getValue(columns[2]) != facturapagaAnt) {
              facturasPagasStr = facturasPagasStr + actual.getValue(columns[2]);
              if (i < facturasPagas.length - 1)
                facturasPagasStr = facturasPagasStr + ",";
              facturapagaAnt = actual.getValue(columns[2]);
            }

          }

          log.audit("imprimirPago_suitelet", "#384 - pdfFileName: " + recPagoProveedor.getValue("entityname") + "-" + facturasPagasStr);
          pdfFileName = recPagoProveedor.getValue("entityname") + "-" + facturasPagasStr + "-" + idPago + ".pdf";

          if (pdfFileName.length > 199) {
            pdfFileName = pdfFileName.substring(195, 0) + ".pdf";
          }
          log.debug("imprimirPago_suitelet", "#381 - FILE NAME :" + pdfFileName);
          if (!isEmpty(retenciones))
            renderer.addSearchResults({
              templateName: "resultsRetenciones",
              searchResult: retenciones
            });

          var retencionString = JSON.stringify(retenciones);
          // for (let i = 0; i < retencionString.length; i += 3000) {
          //   var sub = retencionString.substring(i, i + 3000);
          //   log.audit("imprimirPago_suitelet=" + i, "#396 - retenciones=" + sub);
          // }

          if (!isEmpty(recSubsidiary))
            renderer.addRecord({
              templateName: "recSubsidiary",
              record: recSubsidiary
            });
          log.audit("imprimirPago_suitelet", "#403: recSubsidiary:" + JSON.stringify(recSubsidiary));

          if (!isEmpty(recLogo))
            renderer.addSearchResults({
              templateName: "recLogo",
              searchResult: recLogo
            });
          log.audit("imprimirPago_suitelet", "#410: recLogo:" + JSON.stringify(recLogo));
          
          var accountID = recPagoProveedor.getValue("custbody_l54_cuenta_banco") ? recPagoProveedor.getValue("custbody_l54_cuenta_banco") : recPagoProveedor.getValue("account");
          recPagoProveedor.setValue("account", accountID) 

          log.audit("imprimirPago_suitelet", "#412: antes de addRecord");
          renderer.addRecord({
            templateName: "infoPago",
            record: recPagoProveedor
          });

          var recPagoProveedor = record.load({
            type: tipoRecord,
            id: idPago,
            isDynamic: true,
          });

          if (!isEmpty(datosImpositivos))
            renderer.addSearchResults({
              templateName: "datosImpositivos",
              searchResult: datosImpositivos
          });

          log.audit("imprimirPago_suitelet", "#418: datosImpositivos:" + JSON.stringify(datosImpositivos));

          log.audit("imprimirPago_suitelet", "#421: antes de renderer");
        
          let xml = renderer.renderAsString();

          try {
            /**
             * Si se renderiza apply y credit de esta forma, se obtienen correctamente la cantidad de facturas
             * que se utilizaron y creditos, con record.load esto no funciona, y la cantidad es menor
             * por eso se renderizar estas tablas de esta forma, y luego se inyectan al xml
             */
            log.audit("imprimirPago_suitelet", "antes de renderizar imprimir pago");
            //v1 // var impresionDefaultFormulario = nlapiPrintRecord("TRANSACTION", idPago, "HTML", null);
            const impresionDefaultFormulario = render.transaction({
              entityId: Number(idPago), 
              printMode: render.PrintMode.HTML
            });

            log.audit("imprimirPago_suitelet", "despues de renderizar imprimir pago");
            //v1 // var rtaMiArchivoBraian = base64Decode(miArchivoBraian.getValue());
            const rtaMiArchivoBraian = impresionDefaultFormulario.getContents();
            // log.audit("prueba braian", rtaMiArchivoBraian);
      
            const startTag = "<main>";
            const endTag = "</main>";
      
            let startIndex = rtaMiArchivoBraian.indexOf(startTag);
            const endIndex = rtaMiArchivoBraian.indexOf(endTag);
      
            if (startIndex !== -1 && endIndex !== -1) {
              startIndex += startTag.length;
              const contenidoExtraido = rtaMiArchivoBraian.substring(startIndex, endIndex);
              log.audit("imprimirPago_suitelet contenido extraido", contenidoExtraido);
      
              const inicioTagXml = xml.indexOf(startTag);
              let finTagXml = xml.indexOf(endTag);
      
              if (inicioTagXml !== -1 && finTagXml !== -1) {
                finTagXml += endTag.length;
                xml = xml.substring(0, inicioTagXml) + startTag + contenidoExtraido + endTag + xml.substring(finTagXml);
              }
            }
          } catch (error) {
            log.error("imprimirPago_suitelet renderizar tablas apply y credit", JSON.stringify(error));
          }


          const renderPDF = render.xmlToPdf({
            xmlString: xml
          });

          log.debug("imprimirPago_suitelet", "#426 - FILE NAME :" + pdfFileName);

          log.audit("imprimirPago_suitelet", "#428: Luego de xmlToPDF");

          log.debug("imprimirPago_suitelet", "FIN - Guardar PDF : " + guardarPDF + " ID Carpeta : " + carpetaGuardarPago);

          log.debug("imprimirPago_suitelet", "#432: impresionMasiva:" + impresionMasiva);

          if (impresionMasiva == "SI") {
            log.debug("imprimirPago_suitelet", "#435: impresionMasiva.");
            try {
              /* var renderPDFContent = renderPDF.getValue()

       var archAdj = file.create({
         name: pdfFileName,
         fileType: file.Type.PDF,
         contents: renderPDFContent,
         folder: carpetaGuardarPago
       });*/

              renderPDF.name = pdfFileName;
              renderPDF.Folder = carpetaGuardarPago;
              var idFile = renderPDF.save();


              //var idFile = archAdj.save();
              return "Archivo guardado";
            } catch (e) {
              log.debug("Error grabando PDF de Pago A Proveedor", "NetSuite error: " + e.message);
            }
          }

          log.debug("imprimirPago_suitelet", "#458: enviarPagoyRetencion:" + enviarPagoyRetencion);
          if (enviarPagoyRetencion == "SI") {
            log.debug("imprimirPago_suitelet", "#450: enviarPagoyRetencion.");

            /*var renderPDFContent = renderPDF.getValue()

             var archAdj = file.create({
              name: pdfFileName,
              fileType: file.Type.PDF,
              contents: renderPDFContent,
              folder: carpetaGuardarPago
            });*/

            renderPDF.name = pdfFileName;
            renderPDF.Folder = carpetaGuardarPago;
            idFile = renderPDF.save();

            //var idFile = archAdj.save();

            log.debug("enviarPagoyRetencion", "carpetaGuardarPago: " + carpetaGuardarPago + ", idFile: " + idFile);
            if (!isEmpty(idFile)) {
              try {
                if (recPagoProveedor.getValue("custbody_l54_pdf_retenciones_generado") != "T") {
                  recPagoProveedor.setValue("custbody_l54_pdf_pago_y_reten", idFile);
                  recPagoProveedor.setValue("custbody_l54_pdf_retenciones_generado", "T");
                } else {
                  recPagoProveedor.setValue("custbody_pdf_retenciones_enviado", "T");
                }
                try {
                  var idTmp = recPagoProveedor.save();
                } catch (e) {
                  log.debug("Error grabando PDF de Pago A Proveedor", "NetSuite error: " + e.message);
                  return "Error ver log";
                }
              } catch (e) {
                log.debug("Error grabando PDF de Pago A Proveedor", "NetSuite error: " + e.message);
              }
            }
            return "Archivo guardado";
          }
          if (guardarPDF == true) {
            log.debug("guardarPagoyRetenciones_guardarPDF", "entro guardarPDF");

            try {
              log.debug("guardarPagoyRetenciones_guardarPDF", "#503 - carpetaGuardarPago:" + carpetaGuardarPago);
              if (!isEmpty(carpetaGuardarPago)) {
                const renderPDFContent = renderPDF.getContents(); //change renderPDF.getValue()

                log.debug("guardarPagoyRetenciones_guardarPDF", "#506 - pdfFileName: " + pdfFileName);

                const archAdj = file.create({
                  name: pdfFileName,
                  fileType: file.Type.PDF,
                  contents: renderPDFContent,
                  folder: carpetaGuardarPago
                });

                idFile = archAdj.save();

                if (!isEmpty(idFile)) {
                  log.debug("guardarPagoyRetenciones_guardarPDF", "#519 - idFile: " + idFile);
                  campoPDFPagoYRet = context.request.parameters.campoPDFPagoYRet;
                  log.debug("guardarPagoyRetenciones_guardarPDF", "carpetaGuardarPago: " + carpetaGuardarPago + ", idFile: " + idFile + ", campoPDFPagoYRet: " + campoPDFPagoYRet);
                  if (!isEmpty(campoPDFPagoYRet)) {
                    recPagoProveedor.setValue(campoPDFPagoYRet, idFile);
                    log.debug("guardarPagoyRetenciones_guardarPDF", "#524 - pdfFileName: " + pdfFileName);
                    log.debug("guardarPagoyRetenciones_guardarPDF", "#525 - recPagoProveedor: " + JSON.stringify(recPagoProveedor));
                  } else {
                    recPagoProveedor.setValue(campoPDF, idFile);
                  }
                  try {
                    idTmp = recPagoProveedor.save();
                    if (context.request.parameters.esperarespuesta !== "SI") {
                      return "OK";
                    }
                  } catch (e) {
                    log.debug("Error grabando PDF de Pago A Proveedor", "#533:" + e.message + " trace: " + e.stack);
                  }
                }
              }

              try {
                renderPDF.name = pdfFileName;
                log.debug("guardarPagoyRetenciones_guardarPDF", "#542:" + renderPDF.name);
                context.response.writeFile(renderPDF);
              } catch (e) {
                log.debug("imprimirPago_suitelet", "#545:" + e.message + " trace: " + e.stack);
              }
            } catch (e) {
              log.debug("Error grabando PDF de Pago A Proveedor", "#548:" + e.message + " trace: " + e.stack);
            }
          }
        } else {
          log.debug("imprimirPago_suitelet", "Error Obteniendo ID del Template de Impresion de Pago A Proveedores");
        }

      } catch (e) {
        log.debug("imprimirPago_suitelet", "#556:" + e.message + " trace: " + e.stack);
      }
    }

    return {
      onRequest: onRequest
    };
  });