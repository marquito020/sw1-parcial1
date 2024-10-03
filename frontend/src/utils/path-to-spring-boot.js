import JSZip from "jszip";
import { saveAs } from "file-saver";

// Función para generar y descargar el proyecto Spring Boot como un archivo ZIP
export const generateAndDownloadZip = (
  classes,
  relationships = [],
  associations = [],
  projectName,
  foreignKeys = {},
  foreignKeysAssociations = {}
) => {
  console.log("Clases:", classes);
  console.log("Relaciones:", relationships);
  console.log("Asociaciones:", associations);
  console.log("Nombre del proyecto:", projectName);
  console.log("Claves foráneas:", foreignKeys);
  console.log("Claves foráneas de asociaciones:", foreignKeysAssociations);

  relationships.map((rel) => {
    if (rel.type === "--|>") {
      foreignKeys.push({
        class1: rel.from,
        class2: rel.to,
        foreignKey: rel.from,
      });
    }
  });

  console.log("Claves foráneas actualizadas:", foreignKeys);

  const zip = new JSZip();

  const allDataClass = classes.map((cls) => {
    return {
      name: cls.name,
      attributes: cls.attributes,
      model: [],
      dto: [],
      service: {
        imports: [],
        autowired: [],
        seters: cls.attributes.map((attr) => {
          return `${cls.name.toLowerCase()}.set${
            attr.charAt(0).toUpperCase() + attr.slice(1)
          }(${cls.name.toLowerCase()}DTO.get${
            attr.charAt(0).toUpperCase() + attr.slice(1)
          }());`;
        }),
        setAssociation: [],
        setRelationships: [],
      },
      controller: {
        importsAssociation: [],
        functionsAssociation: [],
      },
    };
  });

  const getDataRelationship = (rel, dataClass) => {
    // Verifica que 'rel' tenga las propiedades necesarias
    if (!rel || !rel.from || !rel.to || !rel.type) return "";

    // Extrae las propiedades con valores por defecto si es necesario
    const { from, to, class1Multiplicity = "", class2Multiplicity = "" } = rel;
    const targetClass = from === dataClass.name ? to : from;

    const includeForeignKey = foreignKeys.some(
      (fk) =>
        fk.class1 === from &&
        fk.class2 === to &&
        fk.foreignKey === dataClass.name
    );

    /* if (class1Multiplicity === "*" && class2Multiplicity === "*") { */
    if (
      (class1Multiplicity === "*" ||
        class1Multiplicity === "0..*" ||
        class1Multiplicity === "1..*") &&
      class2Multiplicity === "1"
    ) {
      if (dataClass.name === to) {
        dataClass.model.push(`@ManyToOne
    @JoinColumn(name = "${to.toLowerCase()}_id")
    @JsonIgnoreProperties("${from.toLowerCase()}s")
    private ${to} ${to.toLowerCase()}; \n `);

        dataClass.dto.push(`private Long ${to.toLowerCase()}Id; \n  `);

        dataClass.service.imports.push(
          `import ${projectName}.demo.model.${to};
import ${projectName}.demo.repository.${to}Repository;
          `
        );

        //* Asigna el autowired al servicio
        dataClass.service.autowired.push(
          `@Autowired
    private ${to}Repository ${to.toLowerCase()}Repository;`
        );

        //* Asigna el setRelationships al servicio
        dataClass.service.setRelationships.push(
          `${to} ${to.toLowerCase()} = ${to.toLowerCase()}Repository.findById(${dataClass.name.toLowerCase()}DTO.get${to}Id()).orElseThrow(() -> new IllegalArgumentException("No se encontró ${dataClass.name.toLowerCase()} con el id " + ${dataClass.name.toLowerCase()}DTO.get${to}Id()));
        ${dataClass.name.toLowerCase()}.set${to}(${to.toLowerCase()});`
        );
      } else {
        /* return `@OneToMany(mappedBy = "${to.toLowerCase()}")
        private Set<${from}> ${from.toLowerCase()}s;`; */
        dataClass.model
          .push(`@OneToMany(mappedBy = "${to.toLowerCase()}", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JsonIgnoreProperties("${to.toLowerCase()}s")
    private List<${from}> ${from.toLowerCase()}s; \n  `);
      }
    } else if (
      class1Multiplicity === "1" &&
      (class2Multiplicity === "*" ||
        class2Multiplicity === "0..*" ||
        class2Multiplicity === "1..*")
    ) {
      if (dataClass.name === from) {
        dataClass.model
          .push(`@OneToMany(mappedBy = "${from.toLowerCase()}", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JsonIgnoreProperties("${from.toLowerCase()}s")
    private List<${to}> ${to.toLowerCase()}s; \n  `);
      } else {
        dataClass.model.push(`@ManyToOne
    @JoinColumn(name = "${from.toLowerCase()}_id")
    @JsonIgnoreProperties("${to.toLowerCase()}s")
    private ${from} ${from.toLowerCase()}; \n `);

        dataClass.dto.push(`private Long ${from.toLowerCase()}Id; \n  `);

        dataClass.service.imports.push(
          `import ${projectName}.demo.model.${from};
import ${projectName}.demo.repository.${from}Repository;
          `
        );

        //* Asigna el autowired al servicio
        dataClass.service.autowired.push(
          `@Autowired
    private ${from}Repository ${from.toLowerCase()}Repository;`
        );

        //* Asigna el setRelationships al servicio
        dataClass.service.setRelationships.push(
          `${from} ${from.toLowerCase()} = ${from.toLowerCase()}Repository.findById(${dataClass.name.toLowerCase()}DTO.get${from}Id()).orElseThrow(() -> new IllegalArgumentException("No se encontró ${dataClass.name.toLowerCase()} con el id " + ${dataClass.name.toLowerCase()}DTO.get${from}Id()));
        ${dataClass.name.toLowerCase()}.set${from}(${from.toLowerCase()});`
        );
      }
    } else if (
      class1Multiplicity === "1" &&
      class2Multiplicity === "1" &&
      includeForeignKey
    ) {
      dataClass.model.push(`@OneToOne
    @JoinColumn(name = "${targetClass.toLowerCase()}_id")
    private ${targetClass} ${targetClass.toLowerCase()}; \n `);

      dataClass.dto.push(`private Long ${targetClass.toLowerCase()}Id; \n `);

      dataClass.service.imports.push(
        `import ${projectName}.demo.model.${targetClass};
import ${projectName}.demo.repository.${targetClass}Repository;
        `
      );

      //* Asigna el autowired al servicio
      dataClass.service.autowired.push(
        `@Autowired
    private ${targetClass}Repository ${targetClass.toLowerCase()}Repository;`
      );

      //* Asigna el setRelationships al servicio
      dataClass.service.setRelationships.push(
        `${targetClass} ${targetClass.toLowerCase()} = ${targetClass.toLowerCase()}Repository.findById(${dataClass.name.toLowerCase()}DTO.get${targetClass}Id()).orElseThrow(() -> new IllegalArgumentException("No se encontró ${dataClass.name.toLowerCase()} con el id " + ${dataClass.name.toLowerCase()}DTO.get${targetClass}Id()));
        ${dataClass.name.toLowerCase()}.set${targetClass}(${targetClass.toLowerCase()});`
      );
    } else {
      dataClass.model.push(`@OneToOne
    @JoinColumn(name = "${targetClass.toLowerCase()}_id")
    private ${targetClass} ${targetClass.toLowerCase()}; \n `);
    }
  };

  // Función para generar el código de la entidad Java en base a los atributos y relaciones
  const generateEntityCode = (
    className,
    attributes = [],
    /* associations = [], */
    model = []
  ) => {
    return `package ${projectName}.demo.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.persistence.*;
import lombok.Data;
import java.io.Serializable;
import java.util.List;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Data
@Table(name = "${
      className.toLowerCase() === "user" ? "users" : className.toLowerCase()
    }")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ${className} implements Serializable {
    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;
    ${attributes.map((attr) => `private String ${attr};`).join("\n    ")}

    ${model.join("\n    ")}
}`;
  };

  // Función para generar el código del repositorio
  const generateRepositoryCode = (className) => {
    return `
package ${projectName}.demo.repository;

import ${projectName}.demo.model.${className};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${className}Repository extends JpaRepository<${className}, Long> {
}`;
  };

  // Función para generar el código del controlador
  const generateControllerCode = (className, controller) => {
    return `package ${projectName}.demo.controller;

import ${projectName}.demo.dto.${className}DTO;
import ${projectName}.demo.model.${className};
import ${projectName}.demo.service.${className}Service;
${controller.importsAssociation.join("\n  ")}
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.Optional;

@RestController
@RequestMapping("/${className.toLowerCase()}")
public class ${className}Controller {
    @Autowired
    private ${className}Service ${className.toLowerCase()}Service;

    @GetMapping
    public List<${className}> getAll() {
        return ${className.toLowerCase()}Service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<${className}> getById(@PathVariable Long id) {
      Optional<${className}> entity = ${className.toLowerCase()}Service.findById(id);
        return entity.map(ResponseEntity::ok)
        .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<${className}> createOrUpdate(@RequestBody ${className}DTO ${className.toLowerCase()}DTO) {
        ${className} ${className.toLowerCase()} = ${className.toLowerCase()}Service.save(${className.toLowerCase()}DTO);
        return ResponseEntity.ok(${className.toLowerCase()});
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        ${className.toLowerCase()}Service.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    ${controller.functionsAssociation.join("\n  ")}
}`;
  };

  // Función para generar el código del servicio
  const generateServiceCode = (className, service = []) => {
    return `package ${projectName}.demo.service;

import ${projectName}.demo.dto.${className}DTO;
import ${projectName}.demo.model.${className};
import ${projectName}.demo.repository.${className}Repository;
${service.imports.join("\n")}
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Optional;
@Service
public class ${className}Service {
    @Autowired
    private ${className}Repository ${className.toLowerCase()}Repository;

    ${service.autowired.join("\n \n    ")}
    ${service.setAssociation.join("\n    ")}
    public List<${className}> findAll() {
        return ${className.toLowerCase()}Repository.findAll();
    }

    public Optional<${className}> findById(Long id) {
        ${className} ${className.toLowerCase()} = ${className.toLowerCase()}Repository.findById(id).orElseThrow(() -> new EntityNotFoundException("No se encontró ${className.toLowerCase()} con el id " + id));
        return Optional.of(${className.toLowerCase()});
    }

    public ${className} save(${className}DTO ${className.toLowerCase()}DTO) {
        ${className} ${className.toLowerCase()} = new ${className}();
        ${service.seters.join("\n        ")}
        ${service.setRelationships.join("\n        ")}
        return ${className.toLowerCase()}Repository.save(${className.toLowerCase()});
    }

    public void deleteById(Long id) {
        ${className} ${className.toLowerCase()} = ${className.toLowerCase()}Repository.findById(id).orElseThrow(() -> new EntityNotFoundException("No se encontró ${className.toLowerCase()} con el id " + id));
        ${className.toLowerCase()}Repository.delete(${className.toLowerCase()});
    }
}`;
  };

  // Funcion para generar el codigo de los DTO
  const generateDTOCode = (className, attributes = [], dto = []) => {
    return `package ${projectName}.demo.dto;
import lombok.Data;
@Data
public class ${className}DTO {
  ${attributes.map((attr) => `private String ${attr};`).join("\n  ")}

  ${dto.join("\n  ")}
}`;
  };

  //Genera el archivo de excepciones
  const generateExceptionCode = () => {
    return `package ${projectName}.demo.exception;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<String> handleEntityNotFoundException(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<String> handleGeneralException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred: " + ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgumentException(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ex.getMessage());
    }

}`;
  };

  // Función para generar el código de las asociaciones intermedias (tablas intermedias)
  const generateAssociationCode = (assoc, dataClass) => {
    const {
      class1,
      class2,
      /* associationClass, */
      class1Multiplicity = "",
      class2Multiplicity = "",
    } = assoc;

    const targetClass = class1 === dataClass.name ? class2 : class1;

    console.log("TargetClass", targetClass);

    console.log("class1", class1);
    console.log("class2", class2);
    console.log("class1Multiplicity", class1Multiplicity);
    console.log("class2Multiplicity", class2Multiplicity);
    console.log("targetClass", targetClass);
    console.log("dataClass", dataClass);
    console.log("foreignKeysAssociations", foreignKeysAssociations);
    console.log("length", foreignKeysAssociations.length);

    if (foreignKeysAssociations.length > 0) {
      dataClass.model.push(`@ManyToMany
    @JoinTable(name = "${dataClass.name.toLowerCase()}_${targetClass.toLowerCase()}",
    joinColumns = @JoinColumn(name = "id_${dataClass.name.toLowerCase()}"),
    inverseJoinColumns = @JoinColumn(name = "id_${targetClass.toLowerCase()}"))
    private Set<${targetClass}> ${targetClass.toLowerCase()}s;\n`);
      foreignKeysAssociations.forEach((fk) => {
        if (fk.class1 === class1 && fk.class2 === class2) {
          if (dataClass.name === fk.classSelector) {
            dataClass.service.imports.push(
              `import ${projectName}.demo.model.${targetClass};
import ${projectName}.demo.repository.${targetClass}Repository;`
            );
            dataClass.service.autowired.push(
              `@Autowired
    private ${targetClass}Repository ${targetClass.toLowerCase()}Repository;`
            );

            dataClass.service.setAssociation.push(
              `public Set<${targetClass}> assign${targetClass}sTo${
                dataClass.name
              } (Long ${dataClass.name.toLowerCase()}Id, Set<Long> ${targetClass.toLowerCase()}Ids) {
        ${
          dataClass.name
        } ${dataClass.name.toLowerCase()} = ${dataClass.name.toLowerCase()}Repository.findById(${dataClass.name.toLowerCase()}Id)
            .orElseThrow(() -> new EntityNotFoundException("${
              dataClass.name
            } con ID " + ${dataClass.name.toLowerCase()}Id + " no encontrado"));

        // Convertimos la lista de ${targetClass.toLowerCase()}s a un Set
        Set<${targetClass}> ${targetClass.toLowerCase()}s = new HashSet<>(${targetClass.toLowerCase()}Repository.findAllById(${targetClass.toLowerCase()}Ids));
        if (${targetClass.toLowerCase()}s.isEmpty()) {
            throw new EntityNotFoundException("No se encontraron ${targetClass.toLowerCase()}s con los IDs proporcionados");
        }

        ${dataClass.name.toLowerCase()}.set${targetClass}s(${targetClass.toLowerCase()}s);
        ${dataClass.name.toLowerCase()}Repository.save(${dataClass.name.toLowerCase()});

        return ${dataClass.name.toLowerCase()}.get${targetClass}s();
    } \n `
            );

            dataClass.controller.importsAssociation.push(
              `import ${projectName}.demo.model.${targetClass};`
            );

            dataClass.controller.functionsAssociation.push(
              `@PostMapping("/{${dataClass.name.toLowerCase()}Id}/${targetClass.toLowerCase()}s")
    public ResponseEntity<Set<${targetClass}>> assign${targetClass}sTo${
                dataClass.name
              }(@PathVariable Long ${dataClass.name.toLowerCase()}Id, @RequestBody Set<Long> ${targetClass.toLowerCase()}Ids) {
        Set<${targetClass}> ${targetClass.toLowerCase()}s = ${dataClass.name.toLowerCase()}Service.assign${targetClass}sTo${
                dataClass.name
              }(${dataClass.name.toLowerCase()}Id, ${targetClass.toLowerCase()}Ids);
        return ResponseEntity.ok(${targetClass.toLowerCase()}s);
    }`
            );
          }
        }
      });
    }
  };

  // Generar archivos de entidades, repositorios, controladores y servicios
  allDataClass.forEach((dataClass) => {
    dataClass = relationships
      .filter((rel) => rel.from === dataClass.name || rel.to === dataClass.name)
      .map((rel) => getDataRelationship(rel, dataClass));
  });

  allDataClass.forEach((dataClass) => {
    dataClass = associations
      .filter(
        (assoc) =>
          assoc.class1 === dataClass.name || assoc.class2 === dataClass.name
      )
      .map((assoc) => generateAssociationCode(assoc, dataClass));
  });

  console.log("allDataClass", allDataClass);

  allDataClass.forEach((cls) => {
    // Verificar si es una clase intermedia (asociación ManyToMany)
    const isIntermediate = associations.some(
      (assoc) => assoc.associationClass === cls.name
    );

    if (!isIntermediate) {
      // Generar archivos de entidades, repositorios, controladores y servicios solo si no es una clase intermedia
      const entityCode = generateEntityCode(
        cls.name,
        cls.attributes,
        /* associations || [], // Verificación adicional */
        cls.model || []
      );
      const repoCode = generateRepositoryCode(cls.name);
      const controllerCode = generateControllerCode(cls.name, cls.controller);
      const serviceCode = generateServiceCode(cls.name, cls.service || []);
      const dtoCode = generateDTOCode(cls.name, cls.attributes, cls.dto || []);
      const exceptionCode = generateExceptionCode();

      // model
      zip.folder("model").file(`${cls.name}.java`, entityCode);
      //repository
      zip.folder("repository").file(`${cls.name}Repository.java`, repoCode);
      //controller
      zip
        .folder("controller")
        .file(`${cls.name}Controller.java`, controllerCode);
      //service
      zip.folder("service").file(`${cls.name}Service.java`, serviceCode);
      //dto
      zip.folder("dto").file(`${cls.name}DTO.java`, dtoCode);
      //exception
      zip
        .folder("exception")
        .file(`GlobalExceptionHandler.java`, exceptionCode);
    }
  });

  zip.generateAsync({ type: "blob" }).then(function (content) {
    saveAs(content, "spring_boot_project.zip");
  });
};

/* // Función para generar el código de las relaciones entre entidades
const generateRelationshipCode = (rel, currentClassName) => {
  // Verifica que 'rel' tenga las propiedades necesarias
  if (!rel || !rel.from || !rel.to || !rel.type) return "";

  // Extrae las propiedades con valores por defecto si es necesario
  const { from, to, class1Multiplicity = "", class2Multiplicity = "" } = rel;
  const targetClass = from === currentClassName ? to : from;

  // Construir las relaciones de acuerdo con las multiplicidades
  const isManyToMany = class1Multiplicity === "*" && class2Multiplicity === "*";
  const isOneToMany =
    class1Multiplicity === "1" &&
    (class2Multiplicity === "*" ||
      class2Multiplicity === "0..*" ||
      class2Multiplicity === "1..*");
  const isManyToOne =
    (class1Multiplicity === "*" ||
      class1Multiplicity === "0..*" ||
      class1Multiplicity === "1..*") &&
    class2Multiplicity === "1";
  const isOneToOne = class1Multiplicity === "1" && class2Multiplicity === "1";

  const includeForeignKey = from === currentClassName;

  // Manejar las multiplicidades para generar las anotaciones adecuadas
  if (isManyToMany) {
    return `
    @ManyToMany
    @JoinTable(name = "${currentClassName.toLowerCase()}_${targetClass.toLowerCase()}",
      joinColumns = @JoinColumn(name = "id_${currentClassName.toLowerCase()}"),
      inverseJoinColumns = @JoinColumn(name = "id_${targetClass.toLowerCase()}"))
    private Set<${targetClass}> ${targetClass.toLowerCase()}s;
    `;
  } else if (isManyToOne) {
    if (currentClassName === to) {
      return `
      @ManyToOne
      @JoinColumn(name = "${to.toLowerCase()}_id")
      private ${to} ${to.toLowerCase()};
      `;
    } else {
      return `
      @OneToMany(mappedBy = "${to.toLowerCase()}")
      private Set<${from}> ${from.toLowerCase()}s;
      `;
    }
  } else if (isOneToMany) {
    if (currentClassName === from) {
      return `
      @OneToMany(mappedBy = "${from.toLowerCase()}")
      private Set<${to}> ${to.toLowerCase()}s;
      `;
    } else {
      return `
      @ManyToOne
      @JoinColumn(name = "${from.toLowerCase()}_id")
      private ${from} ${from.toLowerCase()};
      `;
    }
  } else if (isOneToOne && includeForeignKey) {
    return `
    @OneToOne
    @JoinColumn(name = "id_${targetClass.toLowerCase()}") 
    private ${targetClass} ${targetClass.toLowerCase()};
    `;
  }
  return ""; // Si no coincide con ningún caso, retornar vacío
}; */
