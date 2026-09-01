import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { getErrorMessage } from '../utils/errorMessage';
import { Lock, Edit2, Trash2, UserCircle, Shield } from 'lucide-react';

export default function UsuariosAdmin() {
    const [usuarios, setUsuarios] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permisos, setPermisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore();
    const { pushToast, askConfirm } = useUIStore();
    
    // Tab state
    const [activeTab, setActiveTab] = useState('usuarios');

    // Modals state
    const [modalUserOpen, setModalUserOpen] = useState(false);
    const [modalRolOpen, setModalRolOpen] = useState(false);
    const [editingUsuario, setEditingUsuario] = useState(null);
    const [editingRol, setEditingRol] = useState(null);

    // Form state (Usuarios)
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [selectedRoles, setSelectedRoles] = useState([]);

    // Form state (Roles)
    const [rolNombre, setRolNombre] = useState('');
    const [selectedPermisos, setSelectedPermisos] = useState([]);
    const [assignmentMode, setAssignmentMode] = useState('permisos'); // 'secciones' | 'permisos'
    const [selectedSections, setSelectedSections] = useState([]);
    const { unidadNegocioActiva } = useAuthStore();
    const isHerramientas = parseInt(unidadNegocioActiva) === 2;
    const isAbono = parseInt(unidadNegocioActiva) === 3;

    const SECTIONS = [
        { id: 'ventas', name: 'Ventas', permNames: ['ESCRIBIR_VENTAS', 'LEER_CLIENTES', 'LEER_STOCK'] },
        { id: 'facturacion', name: 'Facturación', permNames: ['LEER_FACTURACION', 'LEER_CLIENTES'] },
        { id: 'productos', name: isHerramientas ? 'Productos' : 'Productos (Plantas)', permNames: ['LEER_STOCK', 'ESCRIBIR_STOCK'] },
        ...(!isHerramientas ? [{ id: 'siembras', name: 'Siembras', permNames: ['LEER_SIEMBRAS', 'ESCRIBIR_SIEMBRAS', 'ADMIN_SIEMBRAS'] }] : []),
        ...(!isHerramientas ? [{ id: 'insumos', name: 'Insumos', permNames: ['LEER_INSUMOS', 'ESCRIBIR_INSUMOS'] }] : []),
        ...(isAbono ? [{ id: 'produccion', name: 'Producción', permNames: ['ESCRIBIR_PRODUCCION'] }] : []),
        { id: 'clientes', name: 'Clientes', permNames: ['LEER_CLIENTES', 'ESCRIBIR_CLIENTES'] },
        { id: 'bandejas', name: 'Devolución de Bandejas', permNames: ['LEER_BANDEJAS', 'ESCRIBIR_BANDEJAS'] },
        ...(isHerramientas ? [{ id: 'pedidos', name: 'Pedidos', permNames: ['LEER_PEDIDOS', 'ESCRIBIR_PEDIDOS'] }] : []),
        ...(isHerramientas ? [{ id: 'finanzas', name: 'Finanzas', permNames: ['LEER_FINANZAS'] }] : []),
        ...(isHerramientas ? [{ id: 'cheques', name: 'Cheques', permNames: ['LEER_FINANZAS'] }] : []),
        { id: 'admin', name: 'Usuarios (Admin)', permNames: ['ADMIN_DB'] }
    ];

    useEffect(() => {
        if (!token) return;
        fetchData();
    }, [token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usRes, rolRes, perRes] = await Promise.all([
                api.get('/usuarios'),
                api.get('/roles'),
                api.get('/roles/permisos')
            ]);
            setUsuarios(usRes?.data || []);
            setRoles(rolRes?.data || []);
            setPermisos(perRes?.data || []);
        } catch (error) {
            console.error('Error fetching data', error);
            pushToast('error', 'Error al cargar datos. Verifique sus permisos.');
        } finally {
            setLoading(false);
        }
    };

    // ================= USUARIOS =================
    const openUserModal = (usuario = null) => {
        setEditingUsuario(usuario);
        if (usuario) {
            setUsername(usuario.username);
            setPassword('');
            setSelectedRoles(usuario.roles ? usuario.roles.map(r => r.id) : []);
        } else {
            setUsername('');
            setPassword('');
            setSelectedRoles([]);
        }
        setModalUserOpen(true);
    };

    const handleRoleToggle = (rolId) => {
        setSelectedRoles(prev => 
            prev.includes(rolId) ? prev.filter(id => id !== rolId) : [...prev, rolId]
        );
    };

    const handleUserSave = async (e) => {
        e.preventDefault();
        const payload = { username, password: password || undefined, roleIds: selectedRoles };
        try {
            if (editingUsuario) await api.put(`/usuarios/${editingUsuario.id}`, payload);
            else await api.post('/usuarios', payload);
            setModalUserOpen(false);
            fetchData();
            pushToast('success', 'Usuario guardado correctamente.');
        } catch (error) {
            console.error(error);
            pushToast('error', getErrorMessage(error, 'Error al guardar usuario'));
        }
    };

    const handleDeleteUser = async (id) => {
        try {
            await api.delete(`/usuarios/${id}`);
            fetchData();
            pushToast('success', 'Usuario eliminado.');
        } catch (error) {
            console.error(error);
            pushToast('error', 'Error al eliminar');
        }
    };

    // ================= ROLES =================
    const openRolModal = (rol = null) => {
        setEditingRol(rol);
        if (rol) {
            setRolNombre(rol.nombre);
            setSelectedPermisos(rol.permisos.map(p => p.id));
            setAssignmentMode('permisos'); // By default when editing, unless we want to try to infer sections
            setSelectedSections([]);
        } else {
            setRolNombre('');
            setSelectedPermisos([]);
            setAssignmentMode('secciones');
            setSelectedSections([]);
        }
        setModalRolOpen(true);
    };

    const handlePermisoToggle = (permisoId) => {
        setSelectedPermisos(prev => 
            prev.includes(permisoId) ? prev.filter(id => id !== permisoId) : [...prev, permisoId]
        );
    };

    const handleSectionToggle = (sectionId) => {
        setSelectedSections(prev => 
            prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
        );
    };

    const handleRolSave = async (e) => {
        e.preventDefault();
        
        let finalPermisoIds = [];
        if (assignmentMode === 'permisos') {
            finalPermisoIds = selectedPermisos;
        } else {
            // Find IDs for all permissions in the selected sections
            const neededNames = SECTIONS.filter(s => selectedSections.includes(s.id))
                                        .flatMap(s => s.permNames);
            finalPermisoIds = permisos.filter(p => neededNames.includes(p.nombre))
                                      .map(p => p.id);
        }

        const payload = { nombre: rolNombre, permisoIds: finalPermisoIds };
        try {
            if (editingRol) await api.put(`/roles/${editingRol.id}`, payload);
            else await api.post('/roles', payload);
            setModalRolOpen(false);
            fetchData();
            pushToast('success', 'Rol guardado correctamente.');
        } catch (error) {
            console.error(error);
            pushToast('error', getErrorMessage(error, 'Error al guardar rol'));
        }
    };

    const handleDeleteRol = async (id) => {
        try {
            await api.delete(`/roles/${id}`);
            fetchData();
            pushToast('success', 'Rol eliminado.');
        } catch (error) {
            console.error(error);
            pushToast('error', getErrorMessage(error, 'Error al eliminar rol'));
        }
    };

    if (loading) return <div className="p-4 text-muted">Cargando...</div>;

    return (
        <div className="p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-ink">Administración</h1>
                <button
                    onClick={activeTab === 'usuarios' ? () => openUserModal() : () => openRolModal()}
                    className="bg-accent hover:brightness-95 text-paper px-4 py-2 rounded-base font-medium transition-colors cursor-pointer"
                >
                    + Nuevo {activeTab === 'usuarios' ? 'Usuario' : 'Rol'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-line mb-6">
                <button
                    onClick={() => setActiveTab('usuarios')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors cursor-pointer ${activeTab === 'usuarios' ? 'border-accent text-accent-ink' : 'border-transparent text-muted hover:text-body hover:border-line-strong'}`}
                >
                    Usuarios
                </button>
                <button
                    onClick={() => setActiveTab('roles')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors cursor-pointer ${activeTab === 'roles' ? 'border-accent text-accent-ink' : 'border-transparent text-muted hover:text-body hover:border-line-strong'}`}
                >
                    Roles y Permisos
                </button>
            </div>

            {/* ===== TAB: USUARIOS ===== */}
            {activeTab === 'usuarios' && (
              <div className="space-y-3">
                {/* MOBILE: Cards */}
                <div className="grid grid-cols-1 gap-3 sm:hidden">
                  {usuarios.map(u => (
                    <div key={u.id} className="bg-paper border border-line rounded-panel p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent-soft text-accent-ink rounded-base flex items-center justify-center shrink-0">
                            <UserCircle className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-ink text-base">{u.username}</h3>
                            <span className="text-xs text-faint">#{u.id}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {!u.roles || u.roles.length === 0 ? (
                          <span className="text-faint italic text-sm">Sin roles asignados</span>
                        ) : u.roles.map((r, idx) => (
                          <span key={idx} className="px-2 py-1 bg-accent-soft text-accent-ink text-xs font-medium rounded-full">{r.nombre}</span>
                        ))}
                      </div>
                      {u.username === 'jefe@vivero.com' || u.username === 'admin2' ? (
                        <span className="text-warn-ink italic text-sm text-center py-1">Usuario protegido</span>
                      ) : (
                        <div className="flex items-center gap-2 pt-3 border-t border-line">
                          <button
                            onClick={() => openUserModal(u)}
                            className="flex-1 py-2 bg-canvas hover:bg-thead text-body font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 border border-line"
                          >
                            <Edit2 className="w-4 h-4" /> Editar
                          </button>
                          <button
                            onClick={() => askConfirm({
                              title: 'Eliminar Usuario',
                              message: '¿Seguro que desea eliminar este usuario?',
                              variant: 'danger',
                              confirmLabel: 'Eliminar',
                              onConfirm: () => handleDeleteUser(u.id),
                            })}
                            className="flex-1 py-2 bg-danger-bg hover:brightness-95 text-danger-ink font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 border border-danger-line"
                          >
                            <Trash2 className="w-4 h-4" /> Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* DESKTOP: Table */}
                <div className="hidden sm:block bg-paper rounded-panel border border-line overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-thead text-body text-sm uppercase tracking-wider border-b border-line">
                        <th className="p-4 font-semibold">ID</th>
                        <th className="p-4 font-semibold">Usuario</th>
                        <th className="p-4 font-semibold">Accesos</th>
                        <th className="p-4 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {usuarios.map(u => (
                        <tr key={u.id} className="hover:bg-canvas transition-colors">
                          <td className="p-4 text-muted">#{u.id}</td>
                          <td className="p-4 font-medium text-ink">{u.username}</td>
                          <td className="p-4">
                            {!u.roles || u.roles.length === 0 ? (
                              <span className="text-faint italic text-sm">Sin roles asignados</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {u.roles.map((r, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-accent-soft text-accent-ink text-xs font-medium rounded-full">{r.nombre}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {u.username === 'jefe@vivero.com' || u.username === 'admin2' ? (
                              <span className="text-warn-ink italic text-sm">Usuario protegido</span>
                            ) : (
                              <>
                                <button onClick={() => openUserModal(u)} className="text-body hover:text-accent-ink font-medium mr-4 cursor-pointer">Editar</button>
                                <button
                                  onClick={() => askConfirm({
                                    title: 'Eliminar Usuario',
                                    message: '¿Seguro que desea eliminar este usuario?',
                                    variant: 'danger',
                                    confirmLabel: 'Eliminar',
                                    onConfirm: () => handleDeleteUser(u.id),
                                  })}
                                  className="text-danger hover:text-danger-ink font-medium cursor-pointer"
                                >Eliminar</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ===== TAB: ROLES ===== */}
            {activeTab === 'roles' && (
              <div className="space-y-3">
                {/* MOBILE: Cards */}
                <div className="grid grid-cols-1 gap-3 sm:hidden">
                  {roles.map(r => (
                    <div key={r.id} className="bg-paper border border-line rounded-panel p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent-soft text-accent-ink rounded-base flex items-center justify-center shrink-0">
                            <Shield className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-ink text-base">{r.nombre}</h3>
                            <span className="text-xs text-faint">#{r.id}</span>
                          </div>
                        </div>
                        {r.enUso && (
                          <span className="flex items-center text-xs font-medium bg-warn-bg text-warn-ink px-2 py-0.5 rounded-full border border-warn-line shrink-0">
                            <Lock size={12} className="mr-1" /> En uso
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(!r.permisos || r.permisos.length === 0) ? (
                          <span className="text-faint italic text-sm">Sin permisos</span>
                        ) : (r.permisos || []).map(p => (
                          <span key={p.id} className="px-2 py-1 bg-thead text-body text-xs font-medium rounded-full border border-line">{p.nombre}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-line">
                        <button
                          onClick={() => openRolModal(r)}
                          className="flex-1 py-2 bg-canvas hover:bg-thead text-body font-medium rounded-base text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 border border-line"
                        >
                          <Edit2 className="w-4 h-4" /> Editar
                        </button>
                        <button
                          onClick={() => askConfirm({
                            title: 'Eliminar Rol',
                            message: '¿Seguro que desea eliminar este rol? Se desasignará de los usuarios.',
                            variant: 'danger',
                            confirmLabel: 'Eliminar',
                            onConfirm: () => handleDeleteRol(r.id),
                          })}
                          disabled={r.enUso}
                          className={`flex-1 py-2 rounded-base text-sm font-medium transition-colors flex items-center justify-center gap-2 border ${r.enUso ? 'bg-canvas text-faint cursor-not-allowed border-line' : 'bg-danger-bg hover:brightness-95 text-danger-ink cursor-pointer border-danger-line'}`}
                        >
                          <Trash2 className="w-4 h-4" /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* DESKTOP: Table */}
                <div className="hidden sm:block bg-paper rounded-panel border border-line overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-thead text-body text-sm uppercase tracking-wider border-b border-line">
                        <th className="p-4 font-semibold">ID</th>
                        <th className="p-4 font-semibold">Nombre del Rol</th>
                        <th className="p-4 font-semibold">Permisos Asignados</th>
                        <th className="p-4 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {roles.map(r => (
                        <tr key={r.id} className="hover:bg-canvas transition-colors">
                          <td className="p-4 text-muted">#{r.id}</td>
                          <td className="p-4 font-medium text-ink">
                            <div className="flex items-center space-x-2">
                              <span>{r.nombre}</span>
                              {r.enUso && (
                                <span className="flex items-center text-xs font-medium bg-warn-bg text-warn-ink px-2 py-0.5 rounded-full border border-warn-line">
                                  <Lock size={12} className="mr-1" /> En uso
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1.5">
                              {(r.permisos || []).map(p => (
                                <span key={p.id} className="px-2 py-1 bg-thead text-body text-xs font-medium rounded-full border border-line">{p.nombre}</span>
                              ))}
                              {(!r.permisos || r.permisos.length === 0) && <span className="text-faint italic text-sm">Sin permisos</span>}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => openRolModal(r)} className="text-body hover:text-accent-ink font-medium mr-4 cursor-pointer">Editar</button>
                            <button
                              onClick={() => askConfirm({
                                title: 'Eliminar Rol',
                                message: '¿Seguro que desea eliminar este rol? Se desasignará de los usuarios.',
                                variant: 'danger',
                                confirmLabel: 'Eliminar',
                                onConfirm: () => handleDeleteRol(r.id),
                              })}
                              disabled={r.enUso}
                              className={`font-medium cursor-pointer ${r.enUso ? 'text-faint cursor-not-allowed' : 'text-danger hover:text-danger-ink'}`}
                              title={r.enUso ? 'No se puede eliminar un rol en uso' : 'Eliminar rol'}
                            >Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Usuario */}
            {modalUserOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
                    <div className="bg-paper rounded-panel border border-line-strong w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-line flex justify-between items-center bg-canvas">
                            <h2 className="text-xl font-bold text-ink">{editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                            <button onClick={() => setModalUserOpen(false)} className="text-faint hover:text-body text-xl font-bold cursor-pointer">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="usuario-form" onSubmit={handleUserSave} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-body mb-1">Username (Email)</label>
                                    <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-2.5 border border-line-strong rounded-base focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-body mb-1">Contraseña {editingUsuario && <span className="text-faint font-normal">(Dejar en blanco para no cambiar)</span>}</label>
                                    <input type="password" required={!editingUsuario} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2.5 border border-line-strong rounded-base focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all" />
                                </div>
                                <div className="pt-4 border-t border-line">
                                    <h3 className="text-lg font-semibold text-ink mb-3">Roles Asignados</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {roles.map(r => (
                                            <label key={r.id} className="flex items-center space-x-3 bg-canvas p-3 rounded-base border border-line cursor-pointer hover:bg-thead transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRoles.includes(r.id)}
                                                    onChange={() => handleRoleToggle(r.id)}
                                                    className="w-4 h-4 text-accent rounded-base border-line-strong focus:ring-accent"
                                                />
                                                <span className="text-sm font-medium text-body">{r.nombre}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-5 border-t border-line bg-canvas flex justify-end gap-3">
                            <button type="button" onClick={() => setModalUserOpen(false)} className="px-5 py-2.5 text-body font-medium hover:bg-thead rounded-base transition-colors cursor-pointer">Cancelar</button>
                            <button type="submit" form="usuario-form" className="px-5 py-2.5 bg-accent hover:brightness-95 text-paper font-medium rounded-base transition-colors cursor-pointer">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Rol */}
            {modalRolOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
                    <div className="bg-paper rounded-panel border border-line-strong w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-line flex justify-between items-center bg-canvas">
                            <h2 className="text-xl font-bold text-ink">{editingRol ? 'Editar Rol' : 'Nuevo Rol'}</h2>
                            <button onClick={() => setModalRolOpen(false)} className="text-faint hover:text-body text-xl font-bold cursor-pointer">&times;</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="rol-form" onSubmit={handleRolSave} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-body mb-1">Nombre del Rol</label>
                                    <input type="text" required value={rolNombre} onChange={(e) => setRolNombre(e.target.value.toUpperCase())} className="w-full p-2.5 border border-line-strong rounded-base focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all" />
                                </div>
                                <div className="pt-4 border-t border-line">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-body">Asignación de Accesos</h3>
                                        <div className="flex bg-canvas rounded-base p-1">
                                            <button
                                                type="button"
                                                onClick={() => setAssignmentMode('secciones')}
                                                className={`px-3 py-1 text-xs font-medium rounded-base transition-colors cursor-pointer ${assignmentMode === 'secciones' ? 'bg-paper text-accent-ink border border-line' : 'text-muted hover:text-body'}`}
                                            >
                                                Por Secciones
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAssignmentMode('permisos')}
                                                className={`px-3 py-1 text-xs font-medium rounded-base transition-colors cursor-pointer ${assignmentMode === 'permisos' ? 'bg-paper text-accent-ink border border-line' : 'text-muted hover:text-body'}`}
                                            >
                                                Avanzado (Permisos)
                                            </button>
                                        </div>
                                    </div>

                                    {assignmentMode === 'secciones' ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {SECTIONS.map(s => (
                                                <label key={s.id} className="flex items-center space-x-3 bg-canvas p-3 rounded-base border border-line cursor-pointer hover:bg-thead transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedSections.includes(s.id)}
                                                        onChange={() => handleSectionToggle(s.id)}
                                                        className="w-4 h-4 text-accent rounded-base border-line-strong focus:ring-accent"
                                                    />
                                                    <span className="text-sm font-medium text-body">{s.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            {permisos.map(p => (
                                                <label key={p.id} className="flex items-center space-x-3 bg-canvas p-3 rounded-base border border-line cursor-pointer hover:bg-thead transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPermisos.includes(p.id)}
                                                        onChange={() => handlePermisoToggle(p.id)}
                                                        className="w-4 h-4 text-accent rounded-base border-line-strong focus:ring-accent"
                                                    />
                                                    <span className="text-sm font-medium text-body">{p.nombre}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        <div className="p-5 border-t border-line bg-canvas flex justify-end gap-3">
                            <button type="button" onClick={() => setModalRolOpen(false)} className="px-5 py-2.5 text-body font-medium hover:bg-thead rounded-base transition-colors cursor-pointer">Cancelar</button>
                            <button type="submit" form="rol-form" className="px-5 py-2.5 bg-accent hover:brightness-95 text-paper font-medium rounded-base transition-colors cursor-pointer">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
