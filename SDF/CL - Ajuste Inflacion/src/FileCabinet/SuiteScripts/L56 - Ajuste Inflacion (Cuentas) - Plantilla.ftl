<#assign obj_data = input.obj_data?eval_json>
<#assign lines = obj_data.lines>
<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns:o="urn:schemas-microsoft-com:office:office" 
    xmlns:x="urn:schemas-microsoft-com:office:excel" 
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns="urn:schemas-microsoft-com:office:spreadsheet" 
    xmlns:x2="urn:schemas-microsoft-com:office:excel2" 
    xmlns:html="http://www.w3.org/TR/REC-html40" 
    xmlns:dt="uuid:C2F41010-65B3-11d1-A29F-00AA00C14882">
    <Styles>
        <!-- ********** TITULO *********** -->
        <Style ss:ID="S22">
        <ss:Alignment ss:Horizontal="Center" ss:Vertical="Center" />
        <ss:Font ss:Bold="1" ss:Color="#000000" ss:FontName="Calibri" ss:Size="11" />
        <ss:Interior ss:Color="#D0D0D0" ss:Pattern="Solid" />
        <ss:Protection ss:Protected="0" x:HideFormula="0" />
        </Style>  
        <Style ss:ID="S23">
        <ss:Alignment ss:Horizontal="Left" ss:Vertical="Center" />
        <ss:Font ss:Bold="1" ss:Color="#000000" ss:FontName="Calibri" ss:Size="11" />
        <ss:Protection ss:Protected="0" x:HideFormula="0" />
        </Style> 
        <Style ss:ID="S24">
        <ss:Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1" />
        <ss:Font ss:Bold="1" ss:Color="#000000" ss:FontName="Calibri" ss:Size="11" />
        <ss:Interior ss:Color="#D0D0D0" ss:Pattern="Solid" />
        <ss:Protection ss:Protected="0" x:HideFormula="0" />
        </Style>
        <Style ss:ID="S26">
        <ss:Alignment ss:Vertical="Bottom" />
        <ss:Font ss:Color="#000000" ss:FontName="Calibri" ss:Size="11" />
        <ss:Protection ss:Protected="1" x:HideFormula="0" />
        </Style>
        <Style ss:ID="S27">
        <ss:Alignment ss:Vertical="Bottom" />
        <ss:Font ss:Color="#000000" ss:FontName="Calibri" ss:Size="11" />
        <ss:NumberFormat ss:Format="0.00" />
        <ss:Protection ss:Protected="1" x:HideFormula="0" />
        </Style>
        <Style ss:ID="S28">
        <ss:Alignment ss:Vertical="Bottom" />
        <ss:Font ss:Color="#000000" ss:FontName="Calibri" ss:Size="11" />
        <ss:NumberFormat ss:Format="0.00\ %" />
        <ss:Protection ss:Protected="1" x:HideFormula="0" />
        </Style>
        <Style ss:ID="S29">
        <ss:Alignment ss:Vertical="Bottom" />
        <ss:Font ss:Bold="1" ss:Color="#000000" ss:FontName="Calibri" ss:Size="11" />
        <ss:NumberFormat ss:Format="0.00" />
        <ss:Protection ss:Protected="1" x:HideFormula="0" />
        </Style>
    </Styles>
    <Worksheet ss:Name="Reporte NetSuite">
        <Table>
            <Column ss:Index="1" ss:Span="10" ss:AutoFitWidth="0" ss:Width="80.25" />
            <Row></Row>
            <Row>
                <Cell ss:MergeAcross="10" ss:MergeDown="0" ss:StyleID="S22"><Data ss:Type="String">${obj_data.params.subsidName}</Data>
                </Cell>
            </Row>
            <Row>
                <Cell ss:MergeAcross="10" ss:MergeDown="0" ss:StyleID="S22"><Data ss:Type="String"> L56 - Reporte por Inflación </Data>
                </Cell>
            </Row>
            <Row>
                <Cell ss:MergeAcross="10" ss:MergeDown="0" ss:StyleID="S22"><Data ss:Type="String">${obj_data.params.periodIniName} - ${obj_data.params.periodFinName} </Data>
                </Cell>
            </Row>

            <!--CABECERA-->
            <Row ss:AutoFitHeight="1" ss:Height="28.50">
                <Cell ss:StyleID="S24"><Data ss:Type="String">Cuenta</Data></Cell>
                <Cell ss:StyleID="S24"><Data ss:Type="String">Tipo</Data></Cell>
                <Cell ss:StyleID="S24"><Data ss:Type="String">Fecha</Data></Cell>
                <Cell ss:StyleID="S24"><Data ss:Type="String">Periodo</Data></Cell>
                <Cell ss:StyleID="S24"><Data ss:Type="String">Número de Documento</Data></Cell>
                <Cell ss:StyleID="S24"><Data ss:Type="String">Nombre</Data></Cell>
                <Cell ss:StyleID="S24"><Data ss:Type="String">Débito</Data></Cell>
                <Cell ss:StyleID="S24"><Data ss:Type="String">Crédito</Data></Cell>
                <Cell ss:StyleID="S24"><Data ss:Type="String">% IPC</Data></Cell>
                <Cell ss:StyleID="S24"><Data ss:Type="String">Importe Reexpresado</Data></Cell>
                <Cell ss:StyleID="S24"><Data ss:Type="String">Importe Ajustado</Data></Cell>
            </Row>
            <#list lines as tranLine>
                <#if tranLine.title == 'true'>
                <Row>
                   <Cell ss:MergeAcross="5" ss:MergeDown="0" ss:StyleID="S23"><Data ss:Type="String">${tranLine.accountName}</Data></Cell>
                   <Cell ss:StyleID="S27"><Data ss:Type="Number">${tranLine.debit}</Data></Cell>                   
                   <Cell ss:StyleID="S27"><Data ss:Type="Number">${tranLine.credit}</Data></Cell>
                   <Cell ss:StyleID="S28"><Data ss:Type="Number">${tranLine.IPC}</Data></Cell>
                   <Cell ss:StyleID="S27"><Data ss:Type="Number">${tranLine.reex}</Data></Cell>
                   <Cell ss:StyleID="S27"><Data ss:Type="Number">${tranLine.ajuste}</Data></Cell>
                </Row>
                <#elseif tranLine.foot == 'true'> 
                <Row>
                    <Cell ss:MergeAcross="5" ss:MergeDown="0" ss:StyleID="S23"><Data ss:Type="String"> Total - ${tranLine.accountName}</Data></Cell>
                    <Cell ss:StyleID="S29"><Data ss:Type="Number">${tranLine.debit}</Data></Cell>                   
                    <Cell ss:StyleID="S29"><Data ss:Type="Number">${tranLine.credit}</Data></Cell>
                    <Cell ss:StyleID="S26"><Data ss:Type="String"> </Data></Cell>
                    <Cell ss:StyleID="S29"><Data ss:Type="Number">${tranLine.reex}</Data></Cell>
                    <Cell ss:StyleID="S29"><Data ss:Type="Number">${tranLine.ajuste}</Data></Cell>
                </Row>
                <#else> 
                <Row>
                   <Cell ss:StyleID="S26"><Data ss:Type="String"> </Data></Cell>
                   <Cell ss:StyleID="S26"><Data ss:Type="String">${tranLine.transType}</Data></Cell>
                   <Cell ss:StyleID="S26"><Data ss:Type="String">${tranLine.transDate}</Data></Cell>
                   <Cell ss:StyleID="S26"><Data ss:Type="String">${tranLine.periodName}</Data></Cell>
                   <Cell ss:StyleID="S26"><Data ss:Type="String">${tranLine.transName}</Data></Cell>
                   <Cell ss:StyleID="S26"><Data ss:Type="String">${tranLine.entityName}</Data></Cell>
                   <Cell ss:StyleID="S27"><Data ss:Type="Number">${tranLine.debit}</Data></Cell>                   
                   <Cell ss:StyleID="S27"><Data ss:Type="Number">${tranLine.credit}</Data></Cell>
                   <Cell ss:StyleID="S28"><Data ss:Type="Number">${tranLine.IPC}</Data></Cell>
                   <Cell ss:StyleID="S27"><Data ss:Type="Number">${tranLine.reex}</Data></Cell>
                   <Cell ss:StyleID="S27"><Data ss:Type="Number">${tranLine.ajuste}</Data></Cell>
                </Row>
                </#if> 
            </#list>
        </Table>
    </Worksheet>
</Workbook>