// @ts-nocheck
import { useState, useEffect } from 'react';
import { 
  Users, FileText, CheckCircle, Clock, LogOut, 
  UserPlus, GraduationCap, ChevronRight, Printer, LayoutDashboard, 
  ClipboardList, Archive, Building, Landmark, 
  ArrowRight, Lock, X, Video, MapPin, Database, AlertCircle, TrendingUp
} from 'lucide-react';

// --- CONFIGURAÇÃO REAL DO FIREBASE ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy 
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// SUAS CHAVES DO MENTORFLOW
const firebaseConfig = {
  apiKey: "AIzaSyDxVE4GiCxfVINVEKZZYKv4tDNqNWMfxKw",
  authDomain: "mentorflow-5f4dd.firebaseapp.com",
  projectId: "mentorflow-5f4dd",
  storageBucket: "mentorflow-5f4dd.firebasestorage.app",
  messagingSenderId: "881130883836",
  appId: "1:881130883836:web:317169b1f09b96cb6fa579",
  measurementId: "G-DWJDQ6Y1QE"
};

// Inicialização segura
let db: any;
let auth: any;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.warn("Erro ao iniciar Firebase", e);
}

const INITIAL_COURSES = [
  "Ciência da Computação", "Engenharia Civil", "Direito", 
  "Administração", "Medicina", "Sistemas de Informação",
  "Direito Constitucional", "Direito Civil"
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  // Correção CRÍTICA: Definindo o tipo do array para evitar erro de 'never[]'
  const [users, setUsers] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  // Courses é constante neste exemplo, removido setCourses não usado
  const [courses] = useState<string[]>(INITIAL_COURSES);
  
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<any>(null);

  // Autenticação
  useEffect(() => {
    if (!auth) {
        setIsLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsSystemReady(true);
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Erro auth:", error);
          setIsLoading(false);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Listeners de Dados
  useEffect(() => {
    if (!db || !isSystemReady) return;

    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id }));
      setUsers(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    });

    const unsubRels = onSnapshot(collection(db, "relationships"), (snapshot: any) => {
      setRelationships(snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id })));
    });

    const qLogs = query(collection(db, "logs"), orderBy("date", "desc"));
    const unsubLogs = onSnapshot(qLogs, (snapshot: any) => {
      setLogs(snapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id })));
      setIsLoading(false);
    });

    return () => {
      unsubUsers();
      unsubRels();
      unsubLogs();
    };
  }, [isSystemReady]);

  // Actions
  const handleAddUserDB = async (userData: any) => {
    if(!db) return;
    try {
      await addDoc(collection(db, "users"), {
        ...userData,
        createdAt: new Date().toISOString()
      });
      alert("Usuário salvo!");
    } catch (e: any) {
      alert("Erro: " + e.message);
    }
  };

  const handleAddLogDB = async (logData: any) => {
    if(!db) return;
    try {
      await addDoc(collection(db, "logs"), {
        ...logData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    } catch (e: any) {
      alert("Erro: " + e.message);
    }
  };

  const handleUpdateLogDB = async (logId: string, updates: any) => {
    if(!db) return;
    try {
      const logRef = doc(db, "logs", logId);
      await updateDoc(logRef, updates);
    } catch (e: any) {
      alert("Erro: " + e.message);
    }
  };

  const handleAllocationDB = async (studentIds: string[], professorId: string) => {
    if(!db) return;
    const batchPromises = studentIds.map(studentId => {
      return addDoc(collection(db, "relationships"), {
        studentId,
        professorId,
        status: 'active',
        createdAt: new Date().toISOString()
      });
    });
    
    await Promise.all(batchPromises);
    alert("Vínculos salvos!");
  };

  const handleRemoveLinkDB = async (relId: string, type = 'delete') => {
    if(!db) return;
    if (type === 'delete') {
      await deleteDoc(doc(db, "relationships", relId));
    } else {
      await updateDoc(doc(db, "relationships", relId), { status: 'completed' });
    }
  };

  const getMyAdvisor = (studentId: string) => {
    const rel = relationships.find((r: any) => r.studentId === studentId && r.status === 'active') || relationships.find((r: any) => r.studentId === studentId);
    return rel ? users.find((u: any) => u.id === rel.professorId) : null;
  };

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center text-blue-600 font-bold animate-pulse">Carregando MentorFlow...</div>;
  }

  if (!currentUser) {
    return (
      <LandingPage 
        users={users} 
        courses={courses}
        onLogin={setCurrentUser} 
      />
    );
  }

  if (currentView === 'print_report' && selectedStudentForReport) {
    const studentLogs = logs.filter((l: any) => l.studentId === selectedStudentForReport.id).sort((a: any,b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const advisor = getMyAdvisor(selectedStudentForReport.id);
    
    return (
      <PrintableReport 
        student={selectedStudentForReport} 
        advisor={advisor} 
        logs={studentLogs} 
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  const getRoleName = (role: string) => {
    switch(role) {
        case 'admin_global': return 'Admin Geral (Global)';
        case 'admin_university': return 'Institucional N1 (Universidade)';
        case 'admin_school': return 'Institucional N2 (Escola)';
        case 'professor': return 'Docente';
        case 'student': return 'Discente';
        default: return 'Usuário';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold">MentorFlow</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Versão Final</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
          
          {currentUser.role === 'admin_global' && <NavItem icon={<Building size={20}/>} label="Universidades (N1)" active={currentView === 'users'} onClick={() => setCurrentView('users')} />}
          {currentUser.role === 'admin_university' && <NavItem icon={<Landmark size={20}/>} label="Escolas (N2)" active={currentView === 'users'} onClick={() => setCurrentView('users')} />}
          {currentUser.role === 'admin_school' && (
            <>
              <NavItem icon={<Users size={20}/>} label="Cadastros" active={currentView === 'users'} onClick={() => setCurrentView('users')} />
              <NavItem icon={<UserPlus size={20}/>} label="Vínculos" active={currentView === 'allocations'} onClick={() => setCurrentView('allocations')} />
            </>
          )}
          {currentUser.role === 'student' && <NavItem icon={<FileText size={20}/>} label="Meus Registros" active={currentView === 'my_logs'} onClick={() => setCurrentView('my_logs')} />}
          {currentUser.role === 'professor' && (
            <>
              <NavItem icon={<ClipboardList size={20}/>} label="Gestão" active={currentView === 'approvals'} onClick={() => setCurrentView('approvals')} />
              <NavItem icon={<Archive size={20}/>} label="Concluídas" active={currentView === 'history'} onClick={() => setCurrentView('history')} />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400 truncate">{getRoleName(currentUser.role)}</p>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="flex items-center gap-2 text-sm text-red-300 hover:text-red-200 w-full">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">
           {(currentUser.role === 'admin_global' || currentUser.role === 'admin_university' || currentUser.role === 'admin_school') && (
             <AdminDashboard 
                user={currentUser} view={currentView} users={users} relationships={relationships} 
                onAddUser={handleAddUserDB} onAllocate={handleAllocationDB} onRemoveLink={handleRemoveLinkDB}
             />
           )}

           {currentUser.role === 'student' && (
             <StudentDashboard 
                view={currentView} user={currentUser} logs={logs} advisor={getMyAdvisor(currentUser.id)}
                onAddLog={handleAddLogDB}
             />
           )}

           {currentUser.role === 'professor' && (
             <ProfessorDashboard 
                view={currentView} user={currentUser} users={users} relationships={relationships} logs={logs}
                onUpdateLog={handleUpdateLogDB} onArchiveLink={(id: string) => handleRemoveLinkDB(id, 'archive')}
                onGenerateReport={(student: any) => { setSelectedStudentForReport(student); setCurrentView('print_report'); }}
             />
           )}
        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
      {icon} <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function LandingPage({ users, courses, onLogin }: any) {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [setupData, setSetupData] = useState({ name: 'Admin Inicial', email: 'admin@sistema.edu', password: '123' });

  // Métricas
  const stats = {
    institutions: users.filter((u: any) => u.role === 'admin_university').length + 120, 
    advisors: users.filter((u: any) => u.role === 'professor').length + 4500,
    students: users.filter((u: any) => u.role === 'student').length + 85000,
    courses: courses.length + 30
  };

  const createFirstAdmin = async (e: any) => {
      e.preventDefault();
      if(!db) return;
      try {
          await addDoc(collection(db, "users"), {
              ...setupData,
              role: 'admin_global',
              createdAt: new Date().toISOString()
          });
          setIsFirstSetup(false);
      } catch (err: any) {
          alert("Erro: " + err.message);
      }
  };

  const handleAuth = (e: any) => {
    e.preventDefault();
    if(password === selectedUser.password) {
        onLogin(selectedUser);
    } else {
        alert("Senha incorreta");
    }
  };

  if (selectedUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="bg-white p-8 rounded-xl w-full max-w-md animate-in zoom-in duration-300">
                <button onClick={() => setSelectedUser(null)} className="text-slate-400 mb-4 hover:text-slate-600 flex items-center gap-1"><ArrowRight className="rotate-180" size={16}/> Voltar</button>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Olá, {selectedUser.name.split(' ')[0]}</h2>
                    <p className="text-slate-500 text-sm">Confirme sua senha para entrar.</p>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                    <input type="password" autoFocus placeholder="Senha" className="w-full p-3 border rounded-lg" value={password} onChange={e => setPassword(e.target.value)} />
                    <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">Acessar Painel</button>
                </form>
            </div>
        </div>
      )
  }

  if (users.length === 0 && !isFirstSetup) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
              <div className="text-center max-w-md">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4"><Database size={32}/></div>
                  <h1 className="text-2xl font-bold mb-2">Banco de Dados Conectado!</h1>
                  <p className="text-slate-500 mb-6">Ainda não há usuários. Crie o primeiro administrador para começar.</p>
                  <button onClick={() => setIsFirstSetup(true)} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700">Criar Admin Geral</button>
              </div>
          </div>
      )
  }

  if (isFirstSetup) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
              <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                  <h2 className="text-xl font-bold mb-4">Configuração Inicial</h2>
                  <form onSubmit={createFirstAdmin} className="space-y-4">
                      <input placeholder="Nome" className="w-full border p-2 rounded" value={setupData.name} onChange={e => setSetupData({...setupData, name: e.target.value})} required />
                      <input placeholder="Email" className="w-full border p-2 rounded" value={setupData.email} onChange={e => setSetupData({...setupData, email: e.target.value})} required />
                      <input placeholder="Senha" type="password" className="w-full border p-2 rounded" value={setupData.password} onChange={e => setSetupData({...setupData, password: e.target.value})} required />
                      <button className="w-full bg-green-600 text-white py-2 rounded font-bold">Salvar e Entrar</button>
                  </form>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-slate-900 tracking-tight">MentorFlow</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#stats" className="text-slate-500 hover:text-blue-600 font-medium">Números</a>
              <a href="#login" className="bg-blue-600 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-700 transition shadow-md hover:shadow-lg">Acessar Sistema</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
              A Gestão Inteligente de <span className="text-blue-400">Orientações Acadêmicas</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-xl">
              Centralize TCCs, teses e dissertações em uma única plataforma. Conectado ao Firebase para segurança total.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <a href="#login" className="px-8 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold text-center transition flex items-center justify-center gap-2">
                Começar Agora <ArrowRight size={20}/>
              </a>
            </div>
          </div>
          <div className="hidden md:block relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30"></div>
            <div className="relative bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl">
               <div className="flex items-center gap-2 mb-6 border-b border-slate-700 pb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
               </div>
               <div className="space-y-3">
                  <div className="bg-slate-700/30 h-10 w-full rounded flex items-center px-4"><div className="w-8 h-8 rounded-full bg-blue-500/20 mr-3"></div><div className="h-2 w-24 bg-slate-600 rounded"></div></div>
                  <div className="bg-slate-700/30 h-10 w-full rounded flex items-center px-4"><div className="w-8 h-8 rounded-full bg-purple-500/20 mr-3"></div><div className="h-2 w-32 bg-slate-600 rounded"></div></div>
                  <div className="bg-slate-700/30 h-10 w-full rounded flex items-center px-4"><div className="w-8 h-8 rounded-full bg-green-500/20 mr-3"></div><div className="h-2 w-20 bg-slate-600 rounded"></div></div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div id="stats" className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div><p className="text-4xl font-bold text-blue-600 mb-1">{stats.students}+</p><p className="text-slate-500 font-medium">Alunos</p></div>
            <div><p className="text-4xl font-bold text-indigo-600 mb-1">{stats.advisors}+</p><p className="text-slate-500 font-medium">Orientadores</p></div>
            <div><p className="text-4xl font-bold text-purple-600 mb-1">{stats.institutions}+</p><p className="text-slate-500 font-medium">Instituições</p></div>
            <div><p className="text-4xl font-bold text-emerald-600 mb-1">{stats.courses}+</p><p className="text-slate-500 font-medium">Disciplinas</p></div>
          </div>
        </div>
      </div>

      <div id="login" className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-4">
            <h3 className="text-2xl font-bold text-slate-800 text-center mb-8">Usuários do Sistema</h3>
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                    {users.map((u: any) => (
                        <button key={u.id} onClick={() => setSelectedUser(u)} className="w-full p-3 border rounded-lg hover:bg-blue-50 text-left flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${u.role.includes('admin') ? 'bg-purple-500' : 'bg-emerald-500'}`}>{u.name.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 truncate">{u.name}</p>
                                <p className="text-xs text-slate-500 truncate">{u.email}</p>
                            </div>
                            <ChevronRight size={16} className="text-slate-300"/>
                        </button>
                    ))}
                    {users.length === 0 && <p className="text-center text-slate-400">Nenhum usuário encontrado. Cadastre o admin inicial.</p>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard({ user, view, users, relationships, onAddUser, onAllocate, onRemoveLink }: any) {
  const [newUser, setNewUser] = useState({ 
    name: '', email: '', role: 'student', institutionName: '', course: '', level: 'Graduação', minSessions: 5,
    limits: { schools: 0, professors: 0, students: 0 }, password: '123'
  });
  const [allocation, setAllocation] = useState({ studentIds: [], professorId: '' });

  const managedUsers = users.filter((u: any) => {
      if (user.role === 'admin_global') return u.role === 'admin_university';
      if (user.role === 'admin_university') return u.role === 'admin_school' && u.parentId === user.id;
      if (user.role === 'admin_school') return (u.role === 'student' || u.role === 'professor') && u.schoolId === user.id;
      return false;
  });

  if (view === 'dashboard') {
      let stats = { schools: 0, professors: 0, students: 0 };
      
      // Cálculo básico de estatísticas
      managedUsers.forEach((u: any) => {
          if (u.role === 'admin_school') stats.schools++;
          if (u.role === 'professor') stats.professors++;
          if (u.role === 'student') stats.students++;
      });

      return (
          <div className="py-10">
              <div className="text-center mb-10"><h2 className="text-3xl font-bold text-slate-800">Painel de Gestão</h2><p className="text-slate-500">{user.role}</p></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded shadow border text-center">
                      <div className="mx-auto h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3"><Users/></div>
                      <h3 className="font-bold text-2xl">{managedUsers.length}</h3>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Gerenciados</p>
                  </div>
              </div>
          </div>
      );
  }

  if (view === 'users') {
      return (
          <div className="space-y-6">
              <div className="bg-white p-6 rounded shadow">
                  <h3 className="font-bold mb-4">Novo Cadastro</h3>
                  <form onSubmit={(e) => { e.preventDefault(); onAddUser({...newUser, parentId: user.id, schoolId: user.id}); }} className="grid gap-4">
                      <input placeholder="Nome" className="border p-2 rounded" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
                      <input placeholder="Email" className="border p-2 rounded" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                      <input placeholder="Senha" className="border p-2 rounded" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                      
                      {user.role === 'admin_school' && (
                          <select className="border p-2 rounded" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                              <option value="student">Aluno</option>
                              <option value="professor">Professor</option>
                          </select>
                      )}
                      
                      {user.role === 'admin_global' && <input placeholder="Nome Universidade" className="border p-2 rounded" value={newUser.institutionName} onChange={e => setNewUser({...newUser, institutionName: e.target.value, role: 'admin_university'})} />}
                      {user.role === 'admin_university' && <input placeholder="Nome Escola/Faculdade" className="border p-2 rounded" value={newUser.institutionName} onChange={e => setNewUser({...newUser, institutionName: e.target.value, role: 'admin_school'})} />}

                      <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Salvar no Banco</button>
                  </form>
              </div>
              
              <div className="bg-white rounded shadow overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 border-b"><tr><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Função</th></tr></thead>
                      <tbody>
                          {managedUsers.map((u: any) => (
                              <tr key={u.id} className="border-b last:border-0">
                                  <td className="p-3">{u.name} {u.institutionName && `(${u.institutionName})`}</td>
                                  <td className="p-3 text-slate-500">{u.email}</td>
                                  <td className="p-3 capitalize">{u.role}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )
  }

  if (view === 'allocations') {
      const students = users.filter((u: any) => u.role === 'student' && u.schoolId === user.id);
      const professors = users.filter((u: any) => u.role === 'professor' && u.schoolId === user.id);
      
      return (
          <div className="bg-white p-6 rounded shadow">
              <h3 className="font-bold mb-4">Vincular Orientador</h3>
              <div className="grid gap-4">
                  <select className="border p-2 rounded" value={allocation.professorId} onChange={e => setAllocation({...allocation, professorId: e.target.value})}>
                      <option value="">Selecione Professor...</option>
                      {professors.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="border rounded max-h-40 overflow-y-auto p-2">
                      {students.map((s: any) => (
                          <label key={s.id} className="flex gap-2 p-1 hover:bg-slate-50 cursor-pointer">
                              <input type="checkbox" checked={allocation.studentIds.includes(s.id as never)} onChange={(e) => {
                                  if(e.target.checked) setAllocation(prev => ({...prev, studentIds: [...prev.studentIds, s.id] as never}));
                                  else setAllocation(prev => ({...prev, studentIds: prev.studentIds.filter(id => id !== s.id) as never}));
                              }}/> {s.name}
                          </label>
                      ))}
                  </div>
                  <button onClick={() => onAllocate(allocation.studentIds, allocation.professorId)} className="bg-green-600 text-white p-2 rounded">Salvar Vínculos</button>
              </div>
          </div>
      )
  }
  return null;
}

function StudentDashboard({ view, user, logs, onAddLog }: any) {
    const [newLog, setNewLog] = useState({ date: '', content: '', type: 'presencial' });
    const myLogs = logs.filter((l: any) => l.studentId === user.id);

    if (view === 'dashboard') return <div className="p-10 text-center"><h2 className="text-2xl font-bold">Meu Progresso</h2><p>{myLogs.length} orientações registradas</p></div>;

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded shadow h-fit">
                <h3 className="font-bold mb-4">Nova Orientação</h3>
                <div className="grid gap-3">
                    <input type="date" className="border p-2 rounded" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                    <div className="flex gap-2 text-sm">
                        <label className="flex items-center gap-1"><input type="radio" name="type" value="presencial" checked={newLog.type === 'presencial'} onChange={e => setNewLog({...newLog, type: 'presencial'})}/> Presencial</label>
                        <label className="flex items-center gap-1"><input type="radio" name="type" value="online" checked={newLog.type === 'online'} onChange={e => setNewLog({...newLog, type: 'online'})}/> Online</label>
                    </div>
                    <textarea className="border p-2 rounded" rows="4" placeholder="Detalhes..." value={newLog.content} onChange={e => setNewLog({...newLog, content: e.target.value})}></textarea>
                    <button onClick={() => onAddLog({...newLog, studentId: user.id})} className="bg-blue-600 text-white p-2 rounded">Enviar</button>
                </div>
            </div>
            <div className="md:col-span-2 space-y-4">
                {myLogs.map((log: any) => (
                    <div key={log.id} className="bg-white p-4 rounded shadow border flex justify-between items-start">
                        <div>
                            <p className="font-bold text-slate-800 flex items-center gap-2">
                                {new Date(log.date).toLocaleDateString()} 
                                <span className="text-xs font-normal px-2 py-0.5 bg-slate-100 rounded">{log.type}</span>
                            </p>
                            <p className="text-slate-600 mt-1">{log.content}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{log.status}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ProfessorDashboard({ view, user, relationships, logs, users, onUpdateLog, onGenerateReport, onArchiveLink }: any) {
    const myRels = relationships.filter((r: any) => r.professorId === user.id && r.status === 'active');
    const myStudentIds = myRels.map((r: any) => r.studentId);
    const pendingLogs = logs.filter((l: any) => l.status === 'pending' && myStudentIds.includes(l.studentId));

    if (view === 'dashboard') return <div className="p-10 text-center"><h2 className="text-2xl font-bold">Painel Docente</h2><p>{myRels.length} orientandos ativos</p></div>;

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded shadow">
                <h3 className="font-bold mb-4 text-yellow-600">Aprovações Pendentes ({pendingLogs.length})</h3>
                <div className="space-y-4">
                    {pendingLogs.map((log: any) => {
                        const st = users.find((u: any) => u.id === log.studentId);
                        return (
                            <div key={log.id} className="border p-4 rounded flex justify-between items-center">
                                <div>
                                    <p className="font-bold">{st?.name} <span className="text-xs font-normal text-slate-500">({new Date(log.date).toLocaleDateString()})</span></p>
                                    <p className="text-sm text-slate-600">{log.content}</p>
                                </div>
                                <button onClick={() => onUpdateLog(log.id, { status: 'approved' })} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Aprovar</button>
                            </div>
                        )
                    })}
                    {pendingLogs.length === 0 && <p className="text-slate-400 italic">Nenhuma pendência.</p>}
                </div>
            </div>

            <div className="bg-white p-6 rounded shadow">
                <h3 className="font-bold mb-4 text-blue-600">Meus Orientandos</h3>
                <div className="space-y-2">
                    {myRels.map((rel: any) => {
                        const st = users.find((u: any) => u.id === rel.studentId);
                        if (!st) return null;
                        return (
                            <div key={rel.id} className="flex justify-between items-center p-3 hover:bg-slate-50 border-b">
                                <span className="font-bold text-slate-700">{st.name}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => onGenerateReport(st)} className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded text-sm">Relatório</button>
                                    <button onClick={() => onArchiveLink(rel.id)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-sm">Encerrar</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function PrintableReport({ student, advisor, logs, onBack }: any) {
    return (
        <div className="bg-white min-h-screen text-black p-8">
            <button onClick={onBack} className="print:hidden mb-4 text-blue-600">Voltar</button>
            <h1 className="text-2xl font-bold text-center border-b-2 border-black pb-4 mb-8">Relatório de Orientação</h1>
            <div className="grid grid-cols-2 gap-4 mb-8 border p-4">
                <div><span className="font-bold">Aluno:</span> {student.name}</div>
                <div><span className="font-bold">Orientador:</span> {advisor?.name}</div>
            </div>
            <table className="w-full border-collapse border border-black text-sm">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2">Data</th>
                        <th className="border border-black p-2">Tipo</th>
                        <th className="border border-black p-2">Atividade</th>
                        <th className="border border-black p-2">Assinatura</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log: any) => (
                        <tr key={log.id}>
                            <td className="border border-black p-2">{new Date(log.date).toLocaleDateString()}</td>
                            <td className="border border-black p-2 capitalize">{log.type}</td>
                            <td className="border border-black p-2">{log.content}</td>
                            <td className="border border-black p-2 text-center text-xs">{log.status === 'approved' ? 'DE ACORDO' : '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mt-8 text-center text-xs">Documento gerado pelo MentorFlow</div>
        </div>
    )
}