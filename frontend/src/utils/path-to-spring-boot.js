import JSZip from "jszip";
import { saveAs } from "file-saver";

// Función para generar y descargar el proyecto Spring Boot como un archivo ZIP
export const generateAndDownloadZip = (
  classes,
  relationships = [],
  associations = [],
  projectName
) => {
  console.log("Clases:", classes);
  console.log("Relaciones:", relationships);
  console.log("Asociaciones:", associations);
  console.log("Nombre del proyecto:", projectName);
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
        setRelationships: [],
      },
    };
  });

  const getDataRelationship = (rel, dataClass) => {
    // Verifica que 'rel' tenga las propiedades necesarias
    if (!rel || !rel.from || !rel.to || !rel.type) return "";

    // Extrae las propiedades con valores por defecto si es necesario
    const { from, to, class1Multiplicity = "", class2Multiplicity = "" } = rel;
    const targetClass = from === dataClass.name ? to : from;

    const includeForeignKey = from === dataClass.name;

    if (class1Multiplicity === "*" && class2Multiplicity === "*") {
      dataClass.model.push(`@ManyToMany
      @JoinTable(name = "${dataClass.name.toLowerCase()}_${targetClass.toLowerCase()}",
        joinColumns = @JoinColumn(name = "id_${dataClass.name.toLowerCase()}"),
        inverseJoinColumns = @JoinColumn(name = "id_${targetClass.toLowerCase()}"))
      private Set<${targetClass}> ${targetClass.toLowerCase()}s; \n `);
    } else if (
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
          `import ${projectName}.demo.model.${to}; \n
import ${projectName}.demo.repository.${to}Repository;
          `
        );

        //* Asigna el autowired al servicio
        dataClass.service.autowired.push(
          `@Autowired
    private ${to}Repository ${to.toLowerCase()}Repository; \n `
        );

        //* Asigna el setRelationships al servicio
        dataClass.service.setRelationships.push(
          `${to} ${to.toLowerCase()} = ${to.toLowerCase()}Repository.findById(${dataClass.name.toLowerCase()}DTO.get${to}Id()).orElseThrow(() -> new RuntimeException("No se encontró el ${dataClass.name.toLowerCase()} con el id " + ${dataClass.name.toLowerCase()}DTO.get${to}Id()));
        ${dataClass.name.toLowerCase()}.set${to}(${to.toLowerCase()});`
        );
      } else {
        /* return `@OneToMany(mappedBy = "${to.toLowerCase()}")
        private Set<${from}> ${from.toLowerCase()}s;`; */
        dataClass.model
          .push(`    @OneToMany(mappedBy = "${to.toLowerCase()}", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
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
          .push(`    @OneToMany(mappedBy = "${from.toLowerCase()}", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @JsonIgnoreProperties("${from.toLowerCase()}s")
    private List<${to}> ${to.toLowerCase()}s; \n  `);
      } else {
        dataClass.model.push(`@ManyToOne
    @JoinColumn(name = "${from.toLowerCase()}_id")
    @JsonIgnoreProperties("${to.toLowerCase()}s")
    private ${from} ${from.toLowerCase()}; \n `);

        dataClass.dto.push(`private Long ${from.toLowerCase()}Id; \n  `);

        dataClass.service.imports.push(
          `import ${projectName}.demo.model.${from}; \n
import ${projectName}.demo.repository.${from}Repository;
          `
        );

        //* Asigna el autowired al servicio
        dataClass.service.autowired.push(
          `@Autowired
    private ${from}Repository ${from.toLowerCase()}Repository; \n `
        );

        //* Asigna el setRelationships al servicio
        dataClass.service.setRelationships.push(
          `${from} ${from.toLowerCase()} = ${from.toLowerCase()}Repository.findById(${dataClass.name.toLowerCase()}DTO.get${from}Id()).orElseThrow(() -> new RuntimeException("No se encontró el ${dataClass.name.toLowerCase()} con el id " + ${dataClass.name.toLowerCase()}DTO.get${from}Id()));
        ${dataClass.name.toLowerCase()}.set${from}(${from.toLowerCase()});`
        );
      }
    } else if (
      class1Multiplicity === "1" &&
      class2Multiplicity === "1" &&
      !includeForeignKey
    ) {
      dataClass.model.push(`@OneToOne
    @JoinColumn(name = "${targetClass.toLowerCase()}_id")
    private ${targetClass} ${targetClass.toLowerCase()}; \n `);

      dataClass.dto.push(`private Long ${targetClass.toLowerCase()}Id; \n `);

      dataClass.service.imports.push(
        `import ${projectName}.demo.model.${targetClass}; \n
import ${projectName}.demo.repository.${targetClass}Repository;
        `
      );

      //* Asigna el autowired al servicio
      dataClass.service.autowired.push(
        `@Autowired
    private ${targetClass}Repository ${targetClass.toLowerCase()}Repository; \n `
      );

      //* Asigna el setRelationships al servicio
      dataClass.service.setRelationships.push(
        `${targetClass} ${targetClass.toLowerCase()} = ${targetClass.toLowerCase()}Repository.findById(${dataClass.name.toLowerCase()}DTO.get${targetClass}Id()).orElseThrow(() -> new RuntimeException("No se encontró el ${dataClass.name.toLowerCase()} con el id " + ${dataClass.name.toLowerCase()}DTO.get${targetClass}Id()));
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
    associations = [],
    model = []
  ) => {
    return `
package ${projectName}.demo.model;

import jakarta.persistence.*;
import lombok.Data;
import java.io.Serializable;
import java.util.List;
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

    ${model.join("\n")}

    ${associations
      .filter(
        (assoc) => assoc.class1 === className || assoc.class2 === className
      )
      .map((assoc) => generateAssociationCode(assoc, className))
      .join("\n    ")}
}
    `;
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
}
    `;
  };

  // Función para generar el código del controlador
  const generateControllerCode = (className) => {
    return `
package ${projectName}.demo.controller;

import ${projectName}.demo.dto.${className}DTO;
import ${projectName}.demo.model.${className};
import ${projectName}.demo.service.${className}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
}
    `;
  };

  // Función para generar el código del servicio
  const generateServiceCode = (className, service) => {
    return `
package ${projectName}.demo.service;
import ${projectName}.demo.dto.${className}DTO;
import ${projectName}.demo.model.${className};
import ${projectName}.demo.repository.${className}Repository;
${service.imports.join("\n  ")}
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Optional;
@Service
public class ${className}Service {
    @Autowired
    private ${className}Repository ${className.toLowerCase()}Repository;

    ${service.autowired.join("\n  ")}
    public List<${className}> findAll() {
        return ${className.toLowerCase()}Repository.findAll();
    }

    public Optional<${className}> findById(Long id) {
        return ${className.toLowerCase()}Repository.findById(id);
    }

    public ${className} save(${className}DTO ${className.toLowerCase()}DTO) {
        ${className} ${className.toLowerCase()} = new ${className}();
        ${service.seters.join("\n        ")}
        ${service.setRelationships.join("\n        ")}
        return ${className.toLowerCase()}Repository.save(${className.toLowerCase()});
    }

    public void deleteById(Long id) {
        ${className.toLowerCase()}Repository.deleteById(id);
    }
}
    `;
  };

  // Funcion para generar el codigo de los DTO
  const generateDTOCode = (className, attributes = [], dto = []) => {
    return `
package ${projectName}.demo.dto;
import lombok.Data;
@Data
public class ${className}DTO {
  ${attributes.map((attr) => `private String ${attr};`).join("\n  ")}

  ${dto.join("\n  ")}
}
    `;
  };

  // Generar archivos de entidades, repositorios, controladores y servicios
  allDataClass.forEach((dataClass) => {
    dataClass = relationships
      .filter((rel) => rel.from === dataClass.name || rel.to === dataClass.name)
      .map((rel) => getDataRelationship(rel, dataClass));
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
        associations || [], // Verificación adicional
        cls.model || []
      );
      const repoCode = generateRepositoryCode(cls.name);
      const controllerCode = generateControllerCode(cls.name);
      const serviceCode = generateServiceCode(cls.name, cls.service);
      const dtoCode = generateDTOCode(cls.name, cls.attributes, cls.dto || []);

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

// Función para generar el código de las asociaciones intermedias (tablas intermedias)
const generateAssociationCode = (assoc, currentClassName) => {
  const {
    class1,
    class2,
    associationClass,
    class1Multiplicity = "",
    class2Multiplicity = "",
  } = assoc;

  if (class1 === currentClassName || class2 === currentClassName) {
    const targetClass = class1 === currentClassName ? class2 : class1;

    return `
    @ManyToMany
    @JoinTable(name = "${currentClassName.toLowerCase()}_${targetClass.toLowerCase()}",
      joinColumns = @JoinColumn(name = "id_${currentClassName.toLowerCase()}"),
      inverseJoinColumns = @JoinColumn(name = "id_${targetClass.toLowerCase()}"))
    private Set<${targetClass}> ${targetClass.toLowerCase()}s;
    `;
  }
  return "";
};
