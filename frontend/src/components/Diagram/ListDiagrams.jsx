import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';
import { useDiagramFetch } from "../../hooks/useDiagramFetch";
import { useUserFetch } from "../../hooks/userFetch";

function ListDiagrams() {
    const { diagrams, deleteDiagramHook } = useDiagramFetch();
    const { users } = useUserFetch();

    // Crear un diccionario (map) para un acceso más rápido a los usuarios por su _id
    const userMap = users.reduce((acc, user) => {
        acc[user._id] = `${user.firstName} ${user.lastName}`;
        return acc;
    }, {});

    const deleteDiagram = (id) => {
        deleteDiagramHook(id);
        window.location.href = "/private/diagrams";
    };

    return (
        <div className="mb-6">
            <div className="flex flex-col">
                <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anfitrión</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participantes</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                                    </tr>
                                </thead>

                                <tbody className="bg-white divide-y divide-gray-200">
                                    {diagrams.map((diagram) => (
                                        <tr key={diagram._id}>
                                            <td className="px-6 py-4 whitespace-nowrap">{diagram.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {/* Usar el mapa para obtener el nombre del anfitrión */}
                                                {userMap[diagram.anfitrion] || "Anfitrión desconocido"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {/* Mostrar los nombres de los participantes usando el map */}
                                                {diagram.participantes
                                                    .map((participanteId) => userMap[participanteId] || "Participante desconocido")
                                                    .join(", ")
                                                }
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap flex items-center space-x-2">
                                                {/* Botón Ver */}
                                                <a href={`/private/diagrams/${diagram._id}`} className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1">
                                                    <FontAwesomeIcon icon={faEye} />
                                                    <span>Ver</span>
                                                </a>
                                                
                                                {/* Botón Eliminar */}
                                                <button
                                                    onClick={() => deleteDiagram(diagram._id)}
                                                    className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                    <span>Eliminar</span>
                                                </button>
                                                
                                                {/* Botón Editar */}
                                                <a href={`/private/diagrams/edit/${diagram._id}`} className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1">
                                                    <FontAwesomeIcon icon={faEdit} />
                                                    <span>Editar</span>
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ListDiagrams;
