# Funcionalidades y Épicas

## Épica 1: Autenticación y RBAC (Prioridad Alta)
- Como Jefe, quiero crear usuarios (username + PIN) para evitar que olviden contraseñas y mantener el control de acceso.
- Como Jefe, quiero un panel de administración global, profesional y sencillo, donde pueda crear Roles, asignarles Permisos específicos, y luego asignar esos roles a mis empleados para cualquiera de los 3 negocios (Plantas, Sustratos y Perlitas, Herramientas) desde un solo lugar.
- Como Usuario, quiero iniciar sesión con mi PIN para operar la aplicación.

## Épica 2: Gestión Multi-Negocio y Catálogo (Prioridad Alta)
- Como Jefe, quiero cambiar entre Plantas, Sustratos y Perlitas, y Herramientas para gestionar cada negocio por separado.
- Como Manager, quiero dar de alta productos con precio de costo y precio de venta para llevar el control del catálogo.

## Épica 3: Operaciones y Ventas en Tiempo Real (Prioridad Alta)
- Como Operario, quiero registrar ventas desde mi celular para descontar stock en el momento.
- Como Vendedor, al registrar una venta quiero poder aplicar un descuento y registrar si el pago fue total, parcial o fiado.
- Como Jefe, quiero que si un operario descuenta stock, mi pantalla se actualice automáticamente (SSE) sin tener que recargar.
- Como Vendedor, quiero generar un remito (comprobante) en PDF/Imagen al finalizar la venta que detalle claramente los datos del negocio emisor y el estado de pago (total, parcial, o a cuenta) para enviarlo por WhatsApp.

## Épica 4: Cuentas Corrientes (Bandejas y Dinero) (Prioridad Media)
- Como Vendedor/Encargado, al buscar un cliente en el sistema quiero ver inmediatamente el total de bandejas y dinero que adeuda.
- Como Encargado de Logística, al registrar una devolución quiero seleccionar una venta específica y poder devolver el total de las bandejas adeudadas o hacer una devolución parcial.
- Como Vendedor, quiero ver si un cliente me debe dinero o bandejas antes de venderle más mercadería.
- Como Vendedor, quiero poder registrar un Pago parcial o total para saldar la cuenta corriente de dinero de un cliente.

## Épica 5: Finanzas y Rentabilidad (Prioridad Media)
- Como Jefe, quiero registrar compras de insumos para llevar el control de gastos.
- Como Jefe, quiero ver reportes de ganancias (Ventas - Costos - Insumos) por Unidad de Negocio para evaluar la rentabilidad.
