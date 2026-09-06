## ADDED Requirements

### Requirement: Búsqueda de ventas por DNI o CUIL
El buscador del Historial de Ventas SHALL aceptar, además del nombre del cliente, el estado de pago y la fecha, el DNI o el CUIL del comprador como criterio de búsqueda, en las tres unidades de negocio.

La búsqueda SHALL alcanzar tanto las ventas vinculadas a un cliente de la agenda —usando los documentos cargados en su ficha— como las ventas a cliente casual que llevan un documento puntual, sin que el usuario tenga que saber de qué tipo de venta se trata.

La comparación de documentos SHALL ignorar los separadores de formato: el sistema SHALL normalizar tanto el texto buscado como el valor almacenado eliminando puntos, guiones, espacios y cualquier otro carácter no alfanumérico antes de comparar, de modo que un documento encontrado no dependa de cómo fue tipeado al cargarlo. La coincidencia SHALL ser parcial, permitiendo encontrar una venta escribiendo solo una parte del documento.

Los criterios de búsqueda existentes SHALL seguir funcionando sin cambios; el documento se suma como una alternativa más dentro del mismo campo de búsqueda.

#### Scenario: Búsqueda por DNI de un cliente de la agenda
- **WHEN** el usuario escribe en el buscador del historial el DNI cargado en la ficha de un cliente
- **THEN** el listado muestra las ventas de ese cliente

#### Scenario: Búsqueda por CUIL
- **WHEN** el usuario escribe en el buscador del historial el CUIL cargado en la ficha de un cliente
- **THEN** el listado muestra las ventas de ese cliente

#### Scenario: Búsqueda por el documento de una venta casual
- **WHEN** el usuario escribe el documento que se cargó puntualmente en una venta a cliente casual, sin cliente vinculado
- **THEN** el listado muestra esa venta

#### Scenario: Búsqueda ignorando el formato del documento
- **WHEN** el documento fue cargado con puntos o guiones y el usuario lo escribe sin separadores, o al revés
- **THEN** el listado igualmente muestra las ventas correspondientes a ese documento

#### Scenario: Búsqueda parcial de documento
- **WHEN** el usuario escribe solo los primeros dígitos de un documento
- **THEN** el listado muestra todas las ventas cuyo documento contiene esa secuencia

#### Scenario: Los criterios previos siguen vigentes
- **WHEN** el usuario busca por nombre de cliente, por estado de pago o por fecha
- **THEN** el listado filtra igual que antes de incorporar la búsqueda por documento

#### Scenario: Ventas sin documento cargado
- **WHEN** el usuario busca un documento y existen ventas sin ningún documento asociado
- **THEN** esas ventas no aparecen en el resultado y la búsqueda no produce ningún error
