## MODIFIED Requirements

### Requirement: Registro de Siembras
El sistema SHALL permitir al usuario registrar una nueva siembra en proceso referenciando a las variedades parametrizadas en el sistema, incorporando retroalimentación visual sobre el equivalente en semillas en base a la cantidad y tipo de bandeja seleccionada. Además, el dueño del lote SHALL ser seleccionado desde una caja de búsqueda que incluya a los clientes registrados.

#### Scenario: Creación exitosa
- **WHEN** el usuario completa el formulario de nueva siembra seleccionando una `VariedadPlanta`, una `VariedadBandeja`, ingresando la cantidad inicial, buscando/seleccionando un dueño (cliente o usuario interno) desde el buscador, número de lote y una `fechaSiembra`
- **THEN** el sistema calcula automáticamente la fecha estimada de entrega obteniendo los días de crecimiento correspondientes al mes de la `fechaSiembra` y sumándolos a dicha fecha (pudiendo ser sobrescrita por el usuario)
- **AND** el formulario muestra de manera dinámica y en tiempo real el equivalente en semillas de las bandejas ingresadas, basándose en las celdas del tipo de bandeja
- **AND** el sistema registra la siembra con estado `EN_PROCESO` referenciando a la planta, bandeja y dueño correspondientes
