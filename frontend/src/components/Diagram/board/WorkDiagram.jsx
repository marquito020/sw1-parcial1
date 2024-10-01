/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { useDiagramFetch } from "../../../hooks/useDiagramFetch";
/* import { useUserFetch } from "../../hooks/userFetch"; */
import plantUmlEncoder from 'plantuml-encoder';
import Config from "../../../config";

// Componentes personalizados
import ProjectNameModal from "../../Modals/ProjectNameModal";
import DiagramViewer from "./DiagramViewer";
import ClassManager from "./ClassManager";
import RelationshipManager from "./RelationshipManager";
import AssociationManager from "./AssociationManager";
import DiagramActions from "./DiagramActions";
import LoadingDiagram from "../../Loading/LoadingDiagram";

import { Bars3Icon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

import { generateAndExportXML } from './../../../utils/path-to-xml-export';
import { generateAndDownloadZip } from "../../../utils/path-to-spring-boot";
import { readXMLFile } from './../../../utils/path-to-utils'; // Cambia 'path-to-utils' por la ruta correcta
import { importXML } from "./ImportFromXML";
import ForeignKeyModal from "./ForeignKeyModal";
import ForeignKeyAssociationModal from "./ForeignKeyAssociationModal";

const { SOCKET_URL } = Config;

export default function WorkDiagram() {
    const [diagramContent, setDiagramContent] = useState("");
    const [diagramName, setDiagramName] = useState("");
    const [diagramId, setDiagramId] = useState("");
    const [diagramAnfitrion, setDiagramAnfitrion] = useState("");
    const [diagramParticipants, setDiagramParticipants] = useState([]);
    const { getDiagramByIdHook, updateDiagramHook } = useDiagramFetch();
    const { _id } = useParams();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    /* const { users } = useUserFetch(); */
    const user = useSelector((state) => state.user);
    const [usersConnected, setUsersConnected] = useState([]);
    const isServerUpdate = useRef(false);  // Nueva bandera para detectar si el cambio proviene del servidor

    // Estados para clases, relaciones y asociaciones
    const [classes, setClasses] = useState([]);
    const [relationships, setRelationships] = useState([]);
    const [associations, setAssociations] = useState([]);
    const [existingDiagram, setExistingDiagram] = useState("");

    // Estado para controlar el ancho del sidebar
    const [sidebarExpanded, setSidebarExpanded] = useState(true);

    // Estados para mostrar u ocultar las secciones
    const [showClassManager, setShowClassManager] = useState(true);
    const [showRelationshipManager, setShowRelationshipManager] = useState(false);
    const [showAssociationManager, setShowAssociationManager] = useState(false);

    // Nombre del proyecto Spring Boot
    const [proyectName, setProyectName] = useState("");
    const [showModal, setShowModal] = useState(false);

    const [showForeignKeyModal, setShowForeignKeyModal] = useState(false);
    const [showProjectNameModal, setShowProjectNameModal] = useState(false);
    const [foreignKeySelections, setForeignKeySelections] = useState({});

    // Modal Assocaition
    const [showForeignKeyAssociationModal, setShowForeignKeyAssociationModal] = useState(false);
    const [foreignKeyAssociation, setForeignKeyAssociation] = useState({});


    /* console.log("Relaciones:", relationships); */
    useEffect(() => {
        const socketInstance = io(SOCKET_URL);
        setSocket(socketInstance);

        // Emitir cuando el usuario se une a la sala
        socketInstance.emit("joinRoom", { diagramId: _id, user: user.email });
        socketInstance.emit("userConnected", { diagramId: _id, user });

        // Escuchar la actualización de usuarios conectados
        socketInstance.on("usersConnectedUpdate", (connectedUsers) => {
            console.log("Usuarios conectados actualizados:", connectedUsers);
            setUsersConnected(connectedUsers);
        });

        // Escuchar la actualización de diagramas desde el servidor
        socketInstance.on("diagramUpdated", (updatedDiagram) => {
            /* console.log("Diagrama actualizado recibido:", updatedDiagram); */
            isServerUpdate.current = true; // Marcamos que el cambio proviene del servidor
            extractClassesAndRelationshipsFromDiagram(updatedDiagram);
            const encodedString = plantUmlEncoder.encode(updatedDiagram);
            const plantUMLUrl = `http://www.plantuml.com/plantuml/svg/${encodedString}`;
            setDiagramContent(plantUMLUrl);
        });

        //Escuchar los usuarios conectados
        socketInstance.on("userConnected", (connectedUsers) => {
            console.log("Usuarios conectados:", connectedUsers);
            /* setUsersConnected(connectedUsers); */
        });

        // Verificar la conexión
        socketInstance.on("connect", () => {
            setIsConnected(true);
        });

        socketInstance.on("disconnect", () => {
            setIsConnected(false);
        });

        // Limpieza al desmontar el componente
        return () => {
            socketInstance.disconnect();
        };
    }, [_id, user.email, user]);

    useEffect(() => {
        const fetchData = async () => {
            const content = await getDiagramByIdHook(_id);
            setDiagramName(content.name);
            setDiagramId(content._id);
            setDiagramAnfitrion(content.anfitrion);
            setDiagramParticipants(content.participantes);

            if (content.plantUML) {
                const chart = `${content.plantUML}`;
                setExistingDiagram(chart);
                extractClassesAndRelationshipsFromDiagram(chart);
                const encodedString = plantUmlEncoder.encode(chart);
                const plantUMLUrl = `http://www.plantuml.com/plantuml/svg/${encodedString}`;
                setDiagramContent(plantUMLUrl);
            }
        };

        fetchData();
    }, [_id]);

    useEffect(() => {
        if ((classes.length || relationships.length || associations.length) && !isServerUpdate.current) {
            handleUpdateDiagramContent(classes, relationships, associations);
        } else {
            // Si fue una actualización desde el servidor, reseteamos el flag
            isServerUpdate.current = false;
        }
    }, [classes, relationships, associations]);

    const extractClassesAndRelationshipsFromDiagram = (diagram) => {
        console.log("Extrayendo clases y relaciones del diagrama", diagram);

        // Regex para capturar las clases correctamente
        const classRegex = /class\s+([a-zA-Z0-9_]+)\s*\{([^}]*)\}/g;

        // Regex para capturar las relaciones complejas (que usan "--", "-->", etc.)
        const relationshipRegex = /([a-zA-Z0-9_]+)\s*(?:"([0-9.*]+(?:\.\.[0-9.*]*)?)")?\s*([<>o*#x^+|}~.\-=]+)\s*(?:"([0-9.*]+(?:\.\.[0-9.*]*)?)")?\s*([a-zA-Z0-9_]+)(?:\s*:\s*([a-zA-Z0-9_]+))?/g;

        // Regex para capturar las asociaciones simples (solo "-") y evitar que se confundan con las relaciones complejas
        const simpleAssociationRegex = /([a-zA-Z0-9_]+)\s*(?:"([0-9.*]+(?:\.\.[0-9.*]*)?)")?\s*-\s*(?:"([0-9.*]+(?:\.\.[0-9.*]*)?)")?\s*([a-zA-Z0-9_]+)(?:\s*:\s*([a-zA-Z0-9_]+))?/g;

        // Regex para capturar asociaciones intermedias (tablas intermedias)
        const tableAssociationRegex = /\((\w+),\s*(\w+)\)\s*\.\.\s*(\w+)/g;

        const foundClasses = [];
        const foundRelationships = [];
        const foundSimpleAssociations = [];
        const foundTableAssociations = [];
        let match;

        // Extraer clases primero
        while ((match = classRegex.exec(diagram)) !== null) {
            const attributes = match[2].trim().split("\n").map(attr => attr.trim()).filter(attr => attr);
            foundClasses.push({ name: match[1], attributes });
        }

        // Mostrar clases encontradas
        console.log("Clases encontradas:", foundClasses);
        setClasses(foundClasses);

        // Limpiar el diagrama para extraer relaciones y asociaciones correctamente
        const cleanedDiagram = diagram
            .split("\n")
            .filter(line => {
                const isClassLine = line.includes("class") || line.includes("{") || line.includes("}");
                const isAttributeLine = foundClasses.some(cls => cls.attributes.some(attr => line.includes(attr)));
                return line.trim().length > 0 && !isClassLine && !isAttributeLine;
            })
            .join("\n");

        console.log("Diagrama limpio:", cleanedDiagram);

        // Extraer asociaciones de tablas intermedias (que utilizan paréntesis)
        while ((match = tableAssociationRegex.exec(cleanedDiagram)) !== null) {
            /* console.log("Asociación intermedia encontrada:", match); */
            const newAssociation = {
                class1: match[1],
                class2: match[2],
                associationClass: match[3],
            };

            if (!foundTableAssociations.some(assoc =>
                assoc.class1 === newAssociation.class1 &&
                assoc.class2 === newAssociation.class2 &&
                assoc.associationClass === newAssociation.associationClass
            )) {
                foundTableAssociations.push(newAssociation);
            }
        }

        // Extraer relaciones complejas (que usan "--", "o--", etc.), excluyendo asociaciones
        const cleanedDiagramWithoutTables = cleanedDiagram.replace(tableAssociationRegex, ""); // Eliminar asociaciones intermedias antes de extraer relaciones

        while ((match = relationshipRegex.exec(cleanedDiagramWithoutTables)) !== null) {
            const newRelationship = {
                from: match[1],
                class1Multiplicity: match[2] || "", // Dejar vacío si no hay multiplicidad
                type: match[3],
                class2Multiplicity: match[4] || "", // Dejar vacío si no hay multiplicidad
                to: match[5],
                name: match[6] || "" // Nombre de la relación (opcional)
            };

            if (newRelationship.type !== "-") {
                // Evitar duplicados
                if (!foundRelationships.some(rel =>
                    rel.from === newRelationship.from &&
                    rel.to === newRelationship.to &&
                    rel.type === newRelationship.type &&
                    rel.name === newRelationship.name
                )) {
                    foundRelationships.push(newRelationship);
                }
            }
        }

        // Extraer asociaciones simples (que usan solo "-"), excluyendo relaciones
        while ((match = simpleAssociationRegex.exec(cleanedDiagramWithoutTables)) !== null) {
            /* console.log("Asociación simple encontrada:", match); */
            const newAssociation = {
                from: match[1],
                class1Multiplicity: match[2] || "", // Dejar vacío si no hay multiplicidad
                to: match[4],
                class2Multiplicity: match[3] || "", // Dejar vacío si no hay multiplicidad
                name: match[5] || "" // Nombre de la asociación (opcional)
            };

            // Evitar duplicados
            // if (newAssociation.type === "-") {
            if (!foundSimpleAssociations.some(assoc =>
                assoc.from === newAssociation.from &&
                assoc.to === newAssociation.to &&
                assoc.name === newAssociation.name
            )) {
                foundSimpleAssociations.push(newAssociation);
            }
            //}
        }

        // Mostrar relaciones y asociaciones encontradas
        console.log("Relaciones encontradas:", foundRelationships);
        setRelationships(foundRelationships);
        /* console.log("Asociaciones simples encontradas:", foundSimpleAssociations);
        console.log("Asociaciones intermedias encontradas:", foundTableAssociations); */

        const foundTableAssociationsData = [];
        foundSimpleAssociations.map(assoc => {
            const newAssociation = {
                class1: assoc.from,
                class2: assoc.to,
                associationClass: foundTableAssociations.find(tableAssoc =>
                    tableAssoc.class1 === assoc.from && tableAssoc.class2 === assoc.to
                )?.associationClass || "",
                class1Multiplicity: assoc.class1Multiplicity,
                class2Multiplicity: assoc.class2Multiplicity,
            };

            if (!foundTableAssociationsData.some(assocData =>
                assocData.class1 === newAssociation.class1 &&
                assocData.class2 === newAssociation.class2 &&
                assocData.associationClass === newAssociation.associationClass
            )) {
                foundTableAssociationsData.push(newAssociation);
            }
        });

        console.log("Asociaciones intermedias encontradas:", foundTableAssociationsData);

        // Combinar todas las asociaciones
        setAssociations(foundTableAssociationsData);
    };


    const handleUpdateDiagramContent = async (updatedClasses = classes, updatedRelationships = relationships, updatedAssociations = associations) => {
        const plantUMLCode = generatePlantUML(updatedClasses, updatedRelationships, updatedAssociations);
        setDiagramContent(plantUMLCode);

        await updateDiagramHook(diagramId, {
            diagram: plantUMLCode,
            name: diagramName,
            anfitrion: diagramAnfitrion,
            participantes: diagramParticipants,
        });

        const encodedString = plantUmlEncoder.encode(plantUMLCode);
        const plantUMLUrl = `http://www.plantuml.com/plantuml/svg/${encodedString}`;
        setDiagramContent(plantUMLUrl);

        console.log("Emitiendo actualización de diagrama");
        socket.emit("updateDiagram", { diagramId, diagramContent: plantUMLCode });
    };

    const generatePlantUML = (updatedClasses = [], updatedRelationships = [], updatedAssociations = []) => {
        let plantUML = "@startuml\n";

        updatedClasses.forEach(cls => {
            plantUML += `class ${cls.name} {\n`;
            cls.attributes.forEach(attr => plantUML += `  ${attr}\n`);
            plantUML += "}\n";
        });

        const validTypes = [
            "<|--", "<|..", "-->", "..>", "..|>", "*--", "--*", "o--", "--o", "--", "--|>", "<|--",
            "<--*", "#--", "x--", "}--", "--+", "^--"
        ];

        updatedRelationships.forEach(rel => {
            console.log("Relación:", rel);
            const { from, to, type, class1Multiplicity, class2Multiplicity, name } = rel;

            if (!validTypes.includes(type)) {
                return;
            }

            // Construir la relación solo con multiplicidades si están presentes
            const relationship = `${from} ${class1Multiplicity ? `"${class1Multiplicity}"` : ""} ${type} ${class2Multiplicity ? `"${class2Multiplicity}"` : ""} ${to}`;

            // Agregar el nombre de la relación si está presente
            plantUML += name ? `${relationship} : ${name}\n` : `${relationship}\n`;

            /* console.log("PlantUML:", plantUML); */
        });


        updatedAssociations.forEach(assoc => {
            if (assoc.class1 && assoc.class2 && assoc.associationClass) {
                if (!plantUML.includes(`class ${assoc.associationClass}`)) {
                    /* plantUML += `class ${assoc.associationClass} {\n`;
                    plantUML += `}\n`; */
                    // Buscar en el plantUML la seccion de class y agregar la clase de asociacion
                    const classAssociation = `class ${assoc.associationClass} {\n}\n`;
                    plantUML = plantUML.replace("@startuml", `@startuml\n${classAssociation}`);
                }

                /* plantUML += `${assoc.class1} "0..*" - "1..*" ${assoc.class2}\n`;
                plantUML += `(${assoc.class1}, ${assoc.class2}) .. ${assoc.associationClass}\n`; */
                // Buscar en el plantUML la seccion de relaciones y agregar la relacion al final
                const relationship = `${assoc.class1} "0..*" - "1..*" ${assoc.class2}\n(${assoc.class1}, ${assoc.class2}) .. ${assoc.associationClass}\n`;
                plantUML += relationship;
                /* plantUML += `class ${assoc.associationClass} {\n`;
                plantUML += `}\n`;
                plantUML += `${assoc.class1} "0..*" - "1..*" ${assoc.class2}\n`;
                plantUML += `(${assoc.class1}, ${assoc.class2}) .. ${assoc.associationClass}\n`; */
            }

            /* console.log("PlantUML:", plantUML); */
        });

        plantUML += "\n@enduml";
        console.log("PlantUML:", plantUML);
        return plantUML;
    };

    const restoreOriginalDiagram = () => {
        setClasses([]);
        setRelationships([]);
        setAssociations([]);
        extractClassesAndRelationshipsFromDiagram(existingDiagram);
    };

    const handleExportXML = () => {
        generateAndExportXML(diagramName, diagramAnfitrion, classes, relationships, associations);
    };

    // Manejar la presentación del modal para la clave foránea
    const handleProjectNameSubmit = (name) => {
        setProyectName(name); // Guardar el nombre del proyecto
        setShowProjectNameModal(false); // Cerrar el modal de nombre del proyecto
        setShowForeignKeyModal(true); // Abrir el modal para seleccionar la clave foránea
    };

    const handleForeignKeySubmit = (selections) => {
        setForeignKeySelections(selections); // Guardar las selecciones
        console.log("Selecciones de clave foránea:", foreignKeySelections);
        setShowForeignKeyModal(false); // Cerrar el modal de clave foránea

        if (associations.length > 0) {
            setShowForeignKeyAssociationModal(true); // Mostrar el modal para seleccionar la clase que llevará la clave foránea
        } else {
            // Proceder con la exportación después de la selección
            generateAndDownloadZip(classes, relationships, associations, proyectName, selections, {});
        }
    };

    const handleForeignKeyAssociationSubmit = (selections) => {
        setForeignKeyAssociation(selections); // Guardar las selecciones
        console.log("Selecciones de clave foránea:", foreignKeyAssociation);
        setShowForeignKeyAssociationModal(false); // Cerrar el modal de clave foránea

        // Proceder con la exportación después de la selección
        generateAndDownloadZip(classes, relationships, associations, proyectName, selections, foreignKeyAssociation);
    };

    const handleExportSpringBoot = () => {
        setShowProjectNameModal(true); // Mostrar el modal para el nombre del proyecto
    };

    // Importar XML y generar clases, relaciones, asociaciones
    const handleImportXML = async (file) => {
        try {
            const xmlString = await readXMLFile(file);

            const { classes, relationships, associations } = importXML(xmlString);

            console.log("Clases importadas:", classes);
            console.log("Relaciones importadas:", relationships);

            // Actualizar el estado o trabajar con las clases, relaciones y asociaciones importadas
            setClasses(classes);
            setRelationships(relationships);
            setAssociations(associations);

            console.log("Clases:", classes);
            console.log("Relaciones:", relationships);
            console.log("Asociaciones:", associations);
        } catch (error) {
            console.error("Error al importar el archivo XML:", error);
        }
    };


    return (
        <div className="flex w-full h-full">
            <div className={`${sidebarExpanded ? "w-64" : "w-16 h-screen"} bg-gray-800 text-gray-300 transition-all duration-300 relative`}>
                <button
                    onClick={() => setSidebarExpanded(!sidebarExpanded)}
                    className="absolute top-4 -right-8 bg-blue-500 p-2 rounded-full text-white shadow-lg"
                >
                    <Bars3Icon className="w-6 h-6" />
                </button>

                {sidebarExpanded && (
                    <div className="p-4 space-y-6">
                        <h1 className="text-2xl font-bold mb-6">{diagramName}</h1>

                        <DiagramActions
                            onSave={() =>
                                handleUpdateDiagramContent(classes, relationships, associations)
                            }
                            onRestore={restoreOriginalDiagram}
                        />

                        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                            onClick={handleExportXML}>Exportar XML</button>

                        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                            onClick={handleExportSpringBoot}>Exportar Spring Boot</button>

                        {/* Modal para ingresar el nombre del proyecto */}
                        <ProjectNameModal
                            show={showProjectNameModal}
                            onClose={() => setShowProjectNameModal(false)}
                            onSubmit={handleProjectNameSubmit}
                        />

                        {/* Modal para seleccionar la clase que llevará la clave foránea */}
                        <ForeignKeyModal
                            show={showForeignKeyModal}
                            onClose={() => setShowForeignKeyModal(false)}
                            onSubmit={handleForeignKeySubmit}
                            relationships={relationships}
                        />

                        {/* Modal para seleccionar la clase que llevará la clave foránea */}
                        <ForeignKeyAssociationModal
                            show={showForeignKeyAssociationModal}
                            onClose={() => setShowForeignKeyAssociationModal(false)}
                            onSubmit={handleForeignKeyAssociationSubmit}
                            associations={associations} // Enviar asociaciones
                        />

                        <input
                            type="file"
                            accept=".xml"
                            onChange={(e) => handleImportXML(e.target.files[0])}
                        />


                        {/* Modal para ingresar el nombre del proyecto */}
                        <ProjectNameModal
                            show={showModal}
                            onClose={() => setShowModal(false)}
                            onSubmit={handleProjectNameSubmit}
                        />

                        <div>
                            <button
                                onClick={() => setShowClassManager(!showClassManager)}
                                className="text-left w-full flex justify-between items-center py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg"
                            >
                                <span>Class Manager</span>
                                {showClassManager ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                            </button>
                            {showClassManager && (
                                <ClassManager
                                    classes={classes}
                                    setClasses={setClasses}
                                    relationships={relationships}
                                    setRelationships={setRelationships}
                                    associations={associations || []}  // <-- Aquí asegúrate de que no sea undefined
                                    setAssociations={setAssociations}
                                    updateDiagram={handleUpdateDiagramContent}
                                />
                            )}
                        </div>

                        <div>
                            <button
                                onClick={() => setShowRelationshipManager(!showRelationshipManager)}
                                className="text-left w-full flex justify-between items-center py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg"
                            >
                                <span>Relationship Manager</span>
                                {showRelationshipManager ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                            </button>
                            {showRelationshipManager && (
                                <RelationshipManager
                                    classes={classes}
                                    relationships={relationships}
                                    setRelationships={setRelationships}
                                    updateDiagram={handleUpdateDiagramContent}
                                />
                            )}
                        </div>

                        <div>
                            <button
                                onClick={() => setShowAssociationManager(!showAssociationManager)}
                                className="text-left w-full flex justify-between items-center py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg"
                            >
                                <span>Association Manager</span>
                                {showAssociationManager ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                            </button>
                            {showAssociationManager && (
                                <AssociationManager
                                    classes={classes}
                                    relationships={relationships}
                                    associations={associations}
                                    setAssociations={setAssociations}
                                    updateDiagram={handleUpdateDiagramContent}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className={`${sidebarExpanded ? "w-3/4" : "w-[calc(100%-64px)]"} flex flex-col justify-center items-center bg-gray-100 p-6 transition-all duration-300`}>
                {diagramContent !== "" ? (
                    <DiagramViewer diagramContent={diagramContent} />
                ) : (
                    <LoadingDiagram />
                )}

                <h2 className="text-lg font-bold mt-4">
                    {isConnected ? "Conectado" : "Desconectado"}
                </h2>

                <h3>Usuarios conectados:</h3>
                <ul>
                    {usersConnected.map((connectedUser, index) => (
                        <li key={index}>{connectedUser.email}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
