/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/search', 'N/record', 'N/format', 'L56/utilidades', 'N/https', 'N/url', 'N/runtime'],

  function (currentRecord, search, record, format, utilities, https, url, runtime) {

    const generarPDF = () => {
      var obj = currentRecord.get(),
        fechaActual = formatearFecha();

      var information = obj.getValue({
            fieldId: 'custpage_data'
          }),
          subsidiary = obj.getValue({
            fieldId: 'custpage_subsidiary'
          }),
          periodFrom = obj.getValue({
            fieldId: 'custpage_period_from'
          }),
          periodTo = obj.getValue({
            fieldId: 'custpage_period_to'
          });

      /*var periodStart = search.lookupFields({
        type: 'accountingperiod',
        id: periodFrom,
        columns: ["startdate"]
      });

      var periodEnd = search.lookupFields({
        type: 'accountingperiod',
        id: periodTo,
        columns: ["enddate"]
      });*/

      var dateIni = new Date(format.parse({ value: periodFrom, type: format.Type.DATE }));
      var dateEnd = new Date(format.parse({ value: periodTo, type: format.Type.DATE }));
      
      var periodF = padding_left(dateIni.getDate(), '0', 2) + "/" + padding_left((parseInt(dateIni.getMonth(), 10) + 1), '0', 2) + "/" + dateIni.getFullYear() ;
      var periodT = padding_left(dateEnd.getDate(), '0', 2) + "/" + padding_left((parseInt(dateEnd.getMonth(), 10) + 1), '0', 2) + "/" + dateEnd.getFullYear() ;
      
      console.log(' Fechas ->> ' + periodF + ' ->> ' + periodT)
      var rango = getMesName(parseInt(dateIni.getMonth(), 10)) + '/ ' + dateIni.getFullYear() + ' - ' + getMesName(parseInt(dateEnd.getMonth(), 10)) + '/ ' + dateEnd.getFullYear();
          
      var urlExt = url.resolveScript({
            scriptId: 'customscript_l56_balance_8_columnas',
            deploymentId: 'customdeploy_l56_balance_8_columnas',
            returnExternalUrl: false
          });


      console.log('informacion ->> ' + information)

      urlExt += '&suitelet=pdf' + '&fechaActual=' + fechaActual + '&subsidiary=' + subsidiary + '&periodFrom=' + periodF + '&periodTo=' + periodT + '&rango=' + rango;
      //'https://tstdrv2662259.app.netsuite.com/app/site/hosting/scriptlet.nl?script=75&deploy=1&suitelet=pdf
      /*var request = https.post({
        url:urlExt,
        body: 'test'
      })*/
      window.open(urlExt,'_blank')
    }


    const generarExcel = () => {
      var obj = currentRecord.get(),
        fechaActual = formatearFecha();

      var information = obj.getValue({
            fieldId: 'custpage_data'
          }),
          subsidiary = obj.getValue({
            fieldId: 'custpage_subsidiary'
          }),
          periodFrom = obj.getValue({
            fieldId: 'custpage_period_from'
          }),
          periodTo = obj.getValue({
            fieldId: 'custpage_period_to'
          }),
          company_info = obj.getValue({
            fieldId: 'custpage_company_info'
          });

      /*var periodStart = search.lookupFields({
        type: 'accountingperiod',
        id: periodFrom,
        columns: ["startdate"]
      });

      var periodEnd = search.lookupFields({
        type: 'accountingperiod',
        id: periodTo,
        columns: ["enddate"]
      });*/

      var dateIni = new Date(format.parse({ value: periodFrom, type: format.Type.DATE }));
      var dateEnd = new Date(format.parse({ value: periodTo, type: format.Type.DATE }));
      
      var OneWorld = runtime.isFeatureInEffect({
        feature: "SUBSIDIARIES"
      })

      if(OneWorld == true || OneWorld == 'T'){
        var resultSubsidiaries = record.load({
          type: 'subsidiary',
          id: subsidiary
        });
      }else{
        company_info = JSON.parse(company_info);
        console.log(company_info)
      }


      if(!utilities.isEmpty(information)){
        information = JSON.parse(information);
        console.log(information)
      }

      let xmlString = printStyleExcel();
  
      xmlString += '<Worksheet ss:Name="Balance 8 Columnas">';
      xmlString += '<Table>';
      xmlString += '<Column ss:Width="316.8"/>';
      xmlString += '<Column ss:AutoFitWidth="0" ss:Width="78" ss:Span="6"/>';
      xmlString += '<Column ss:Index="11" ss:AutoFitWidth="0" ss:Width="72.599999999999994"/>';
      
      /** Campos Subsidiaria */
      xmlString += '<Row>';
      xmlString += '<Cell><Data ss:Type="String">' + `${OneWorld ? resultSubsidiaries.getValue('name') : company_info.companyname}` + '</Data></Cell>';
      xmlString += '</Row>';
      xmlString += '<Row>';
      xmlString += '<Cell><Data ss:Type="String">' + `${OneWorld ? resultSubsidiaries.getValue('legalname') : company_info.legalname}`  + '</Data></Cell>';
      xmlString += '</Row>';
      xmlString += '<Row>';
      xmlString += '<Cell><Data ss:Type="String">' + `${OneWorld ? resultSubsidiaries.getValue('mainaddress_text') : company_info.mainaddress_text}` + '</Data></Cell>';
      xmlString += '</Row>';
      xmlString += '<Row>';
      xmlString += '<Cell><Data ss:Type="String">' + `${OneWorld ? resultSubsidiaries.getValue('custrecord_l56_num_ide_iva') : company_info.taxidnum}` + '</Data></Cell>';
      xmlString += '<Cell ss:Index="8"><Data ss:Type="String">Fecha :</Data></Cell>';
      xmlString += '<Cell><Data ss:Type="String">' + fechaActual + '</Data></Cell>'; // Campo Fecha
      xmlString += '</Row>';

      /** Campos Cabecera */
      xmlString += '<Row ss:Index="6" ss:Height="15.600000000000001">';
      xmlString += '<Cell ss:MergeAcross="8" ss:StyleID="s81"><Data ss:Type="String">Balance Tributario</Data></Cell>';
      xmlString += '</Row>';
      xmlString += '<Row>';
      xmlString += '<Cell ss:MergeAcross="8" ss:StyleID="s83"><Data ss:Type="String"> Acumulado Desde - Hasta</Data></Cell>';
      xmlString += '</Row>';
      xmlString += '<Row>';
      xmlString += '<Cell ss:MergeAcross="8" ss:StyleID="s83"><Data ss:Type="String"> ' + getMesName(parseInt(dateIni.getMonth(), 10)) + '/ ' + dateIni.getFullYear() + ' - ' + getMesName(parseInt(dateEnd.getMonth(), 10)) + '/ ' + dateEnd.getFullYear() + '</Data></Cell>';
      xmlString += '</Row>';

      /** Campos Titulos */
      xmlString += '<Row ss:Index="12">';
      xmlString += '<Cell ss:StyleID="s62"><Data ss:Type="String">Cuenta Contable</Data></Cell>';
      xmlString += '<Cell ss:MergeAcross="1" ss:StyleID="s82"><Data ss:Type="String">Valores Acumulados</Data></Cell>';
      xmlString += '<Cell ss:MergeAcross="1" ss:StyleID="s82"><Data ss:Type="String">Saldos</Data></Cell>';
      xmlString += '<Cell ss:MergeAcross="1" ss:StyleID="s82"><Data ss:Type="String">Inventario</Data></Cell>';
      xmlString += '<Cell ss:MergeAcross="1" ss:StyleID="s82"><Data ss:Type="String">Resultados</Data></Cell>';
      xmlString += '</Row>';
      xmlString += '<Row>';
      xmlString += '<Cell ss:StyleID="s63"/>';
      xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="String">Débitos</Data></Cell>';
      xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="String">Créditos</Data></Cell>';
      xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="String">Deudor</Data></Cell>';
      xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="String">Acreedor</Data></Cell>';
      xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="String">Activo</Data></Cell>';
      xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="String">Pasivo</Data></Cell>';
      xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="String">Pérdida</Data></Cell>';
      xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="String">Ganancia</Data></Cell>';
      xmlString += '</Row>';

      /** Datos */
      if(!utilities.isEmpty(information)){
        for (var i in information.data ) {
          xmlString += '<Row>';
          xmlString += '<Cell ss:StyleID="s63"><Data ss:Type="String">' + information.data[i].account + '</Data></Cell>';
          xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="Number">' + information.data[i].debito + '</Data></Cell>';
          xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="Number">' + information.data[i].credito + '</Data></Cell>';
          xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="Number">' + information.data[i].deudor + '</Data></Cell>';
          xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="Number">' + information.data[i].acreedor + '</Data></Cell>';
          xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="Number">' + information.data[i].activo + '</Data></Cell>';
          xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="Number">' + information.data[i].pasivo + '</Data></Cell>';
          xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="Number">' + information.data[i].perdida + '</Data></Cell>';
          xmlString += '<Cell ss:StyleID="s64"><Data ss:Type="Number">' + information.data[i].ganancia + '</Data></Cell>';
          xmlString += '</Row>';
        }
  
        /** Totales */
        xmlString += '<Row>';
        xmlString += '<Cell ss:StyleID="s65"><Data ss:Type="String">Sub-Totales</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.totals.debito + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.totals.credito + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.totals.deudor + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.totals.acreedor + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.totals.activo + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.totals.pasivo + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.totals.perdida + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.totals.ganancia + '</Data></Cell>';
        xmlString += '</Row>';
  
        xmlString += '<Row>';
        xmlString += '<Cell ss:StyleID="s65"><Data ss:Type="String">Pérdidas / Ganancias</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.diferents.debito + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.diferents.credito + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.diferents.deudor + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.diferents.acreedor + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.diferents.activo + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.diferents.pasivo + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.diferents.perdida + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.diferents.ganancia + '</Data></Cell>';
        xmlString += '</Row>';
  
        xmlString += '<Row>';
        xmlString += '<Cell ss:StyleID="s65"><Data ss:Type="String">Total General</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.result.debito + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.result.credito + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.result.deudor + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.result.acreedor + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.result.activo + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.result.pasivo + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.result.perdida + '</Data></Cell>';
        xmlString += '<Cell ss:StyleID="s84"><Data ss:Type="Number">' + information.result.ganancia + '</Data></Cell>';
        xmlString += '</Row>';
      }

      /** Pie de pagina */
      xmlString += '<Row>';
      xmlString += '<Cell ss:MergeAcross="8" ss:StyleID="m2362598518208"><Data ss:Type="String">Observación : </Data></Cell>';
      xmlString += '</Row>';
      xmlString += '<Row ss:AutoFitHeight="0" ss:Height="36.449999999999996">';
      xmlString += '<Cell ss:MergeAcross="8" ss:StyleID="m2362598518228"><Data ss:Type="String">De acuerdo al artículo 100 del código tributario, la sociedad es responsable de la veracidad de la información &#13;&#10;entregada a los contadores para la preparación de los asientos contables y el balance general&#13;&#10;</Data></Cell>';
      xmlString += '</Row>';

      xmlString += '</Table></Worksheet></Workbook>';
      
      let xmlStringBlob = new Blob([xmlString], { type: 'text/plain' });
  
      downloadFileInBrowser(xmlStringBlob, '.xls');

    }

    const printStyleExcel = () => {
        let strExcel = '';
    
        strExcel += '<?xml version="1.0" encoding="UTF-8" ?><?mso-application progid="Excel.Sheet"?>';
        //strExcel += '<?mso-application progid="Excel.Sheet"?>';
        strExcel += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ';
        strExcel += 'xmlns:o="urn:schemas-microsoft-com:office:office" ';
        strExcel += 'xmlns:x="urn:schemas-microsoft-com:office:excel" ';
        strExcel += 'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" ';
        strExcel += 'xmlns:html="http://www.w3.org/TR/REC-html40">';
        //Estilos de Celdas
        strExcel += '<Styles>';
        strExcel += '<Style ss:ID="Default" ss:Name="Normal">';
        strExcel += '<Alignment ss:Vertical="Bottom"/>';
        strExcel += '<Borders/>';
        strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11"/>';
        strExcel += '<Interior/>';
        strExcel += '<NumberFormat/>';
        strExcel += '<Protection/>';
        strExcel += '</Style>';
        strExcel += '<Style ss:ID="m2362598518208">';
        strExcel += '<Borders>';
        strExcel += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '</Borders>';
        strExcel += '<NumberFormat ss:Format="@"/>';
        strExcel += '</Style>';
        strExcel += '<Style ss:ID="m2362598518228">';
        strExcel += '<Alignment ss:Vertical="Center" ss:WrapText="1"/>';
        strExcel += '<Borders>';
        strExcel += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '</Borders>';
        strExcel += '<NumberFormat ss:Format="@"/>';
        strExcel += '</Style>';
        strExcel += '<Style ss:ID="s62">';
        strExcel += '<Alignment ss:Vertical="Center"/>';
        strExcel += '<Borders>';
        strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '</Borders>';
        strExcel += '<Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>';
        strExcel += '</Style>';
        strExcel += '<Style ss:ID="s63">';
        strExcel += '<Borders>';
        strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '</Borders>';
        strExcel += '<NumberFormat ss:Format="@"/>';
        strExcel += '</Style>';
        strExcel += '<Style ss:ID="s64">';
        strExcel += '<Borders>';
        strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '</Borders>';
        strExcel += '<NumberFormat ss:Format="###,###,###,##0"/>';
        strExcel += '</Style>';
        strExcel += '<Style ss:ID="s65">';
        strExcel += '<Borders>';
        strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '</Borders>';
        strExcel += '<Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>';
        strExcel += '<NumberFormat ss:Format="@"/>';
        strExcel += '</Style>';
        strExcel += '<Style ss:ID="s81">';
        strExcel += '<Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>';
        strExcel += '<Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1"/>';
        strExcel += '</Style>';
        strExcel += '<Style ss:ID="s82">';
        strExcel += '<Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>';
        strExcel += '<Borders>';
        strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '</Borders>';
        strExcel += '<Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>';
        strExcel += '</Style>';
        strExcel += '<Style ss:ID="s83">';
        strExcel += '<Alignment ss:Horizontal="Center" ss:Vertical="Bottom"/>';
        strExcel += '<Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>';
        strExcel += '</Style>';
        strExcel += '<Style ss:ID="s84">';
        strExcel += '<Borders>';
        strExcel += '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>';
        strExcel += '</Borders>';
        strExcel += '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>';
        strExcel += '<NumberFormat ss:Format="###,###,###,##0"/>';
        strExcel += '</Style>';
        strExcel += '</Styles>';
    
        return strExcel ;
    }

    const downloadFileInBrowser = (blobFile, extension) => {
        let link = document.createElement("a");
        link.href = window.URL.createObjectURL(blobFile);
        link.setAttribute("download", "Balance Tributario" + extension);
        link.style.display = "none";
        document.body.appendChild(link);
        
        link.click();
        setTimeout(function () {
            document.body.removeChild(link);
        }, 5e3);
    
    }

    function formatearFecha() {
      
      var f = new Date();
      var formattedstring = padding_left(f.getDate(), '0', 2) + "/" + padding_left((parseInt(f.getMonth(), 10) + 1), '0', 2) + "/" + f.getFullYear() ;
      return formattedstring;
      
    }

    function padding_left(s, c, n) {

      if (!s || !c || s.toString().length >= n) {
          return s;
      }
      var max = (n - s.toString().length) / c.toString().length;
      for (var i = 0; i < max; i++) {
          s = c + s;
      }
      return s;
    }
    
    function getMesName(mes) {

      mes = parseInt(mes) + 1;
    
      if (mes == 1)
        return 'Enero';
      else if (mes == 2)
        return 'Febrero';
      else if (mes == 3)
        return 'Marzo';
      else if (mes == 4)
        return 'Abril';
      else if (mes == 5)
        return 'Mayo';
      else if (mes == 6)
        return 'Junio';
      else if (mes == 7)
        return 'Julio';
      else if (mes == 8)
        return 'Agosto';
      else if (mes == 9)
        return 'Septiembre';
      else if (mes == 10)
        return 'Octubre';
      else if (mes == 11)
        return 'Noviembre';
      else if (mes == 12)
        return 'Diciembre';
    }

    return {
      generarExcel: generarExcel,
      generarPDF: generarPDF
    };
  });