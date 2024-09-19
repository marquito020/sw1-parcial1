import { useDiagramFetch } from "../../hooks/useDiagramFetch";
import { useUserFetch } from "../../hooks/userFetch";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function EditDiagram() {
    const { _id } = useParams();
    const { createInvitationHook, getDiagramByIdHook } = useDiagramFetch();
    const { users } = useUserFetch();

    const [diagram, setDiagram] = useState({});
    const [name, setName] = useState("");
    const [anfitrion, setAnfitrion] = useState("");
    const [participantes, setParticipantes] = useState([]);
    const [selectedParticipantes, setSelectedParticipantes] = useState();

    useEffect(() => {
        const fetchData = async () => {
            const data = await getDiagramByIdHook(_id);
            setDiagram(data.plantUML);
            setName(data.name);
            setAnfitrion(data.anfitrion);
            setParticipantes(data.participantes);
        }
        fetchData();
    }, [_id]);

    const updateDiagram = async () => {
        try {

            if (selectedParticipantes !== undefined) {
                participantes.unshift(selectedParticipantes[0]);
            }
            /* participantes.push(selectedParticipantes[0]); */
            const data = await createInvitationHook(_id, { diagram: diagram, name: name, anfitrion: anfitrion, participantes: participantes });
            console.log(data);
            window.location.href = "/private/diagrams";
        } catch (error) {
            console.log(error);
        }
    }

    const selectParticipantes = () => {
        const participantes = document.getElementById("participantes");
        const options = participantes && participantes.options;
        const values = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                values.push(options[i].value);
            }
        }
        console.log(values);
        setSelectedParticipantes(values);
    }

    return (
        <div className="flex flex-col">
            <div className="flex flex-col">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">

                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">

                            <div className="px-4 py-5 bg-white sm:p-6">
                                <div className="grid grid-cols-6 gap-6">

                                    <div className="col-span-6 sm:col-span-3">
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label>
                                        <input
                                            type="text"
                                            name="name"
                                            id="name"
                                            autoComplete="given-name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                        />
                                    </div>

                                    <div className="col-span-6 sm:col-span-3">
                                        <label htmlFor="anfitrion" className="block text-sm font-medium text-gray-700">Anfitrión</label>
                                        <select
                                            id="anfitrion"
                                            name="anfitrion"
                                            autoComplete="anfitrion"
                                            value={anfitrion}
                                            onChange={(e) => setAnfitrion(e.target.value)}
                                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        >
                                            {users.map((user) => (
                                                <option key={user._id} value={user._id}>{user.firstName + " " + user.lastName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-span-6 sm:col-span-3">
                                        <label htmlFor="participantes" className="block text-sm font-medium text-gray-700">Seleccionar Participantes</label>
                                        <select
                                            id="participantes"
                                            name="participantes"
                                            autoComplete="participantes"
                                            value={selectedParticipantes}
                                            onChange={selectParticipantes}
                                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                            multiple
                                        >
                                            {users.filter(user => !participantes.some(participante => participante[0] === user._id))
                                                .map(user => (
                                                    <option key={user._id} value={user._id}>
                                                        {user.firstName + " " + user.lastName}
                                                    </option>
                                                ))
                                            }

                                        </select>
                                    </div>

                                    {/* Participantes Existentes */}
                                    <div className="col-span-6 sm:col-span-3">
                                        <label htmlFor="participantes" className="block text-sm font-medium text-gray-700">Participantes Existentes</label>
                                        {participantes.map((participante) => (
                                            console.log(participante),
                                            <div key={participante} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">{users.map((user) => (user._id === participante[0]) ? user.firstName + " " + user.lastName : "")}</div>
                                        ))}
                                    </div>

                                    {/* Anfitrion Existente */}
                                    <div className="col-span-6 sm:col-span-3">
                                        <label htmlFor="anfitrion" className="block text-sm font-medium text-gray-700">Anfitrion Existente</label>
                                        <div className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">{users.map((user) => (user._id === anfitrion) ? user.firstName + " " + user.lastName : "")}</div>
                                    </div>
                                    <div className="col-span-6 sm:col-span-3">
                                        <button onClick={updateDiagram} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full" type="button">
                                            Actualizar Diagrama
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}