import JSZip from "jszip";
import { saveAs } from "file-saver";

// Función para generar y descargar el proyecto Spring Boot como un archivo ZIP
export const generateAndDownloadZip = (
  classes,
  relationships,
  associations
) => {
  const zip = new JSZip();

  classes.forEach((cls) => {
    // Verificar si es una clase intermedia (asociación ManyToMany)
    const isIntermediate = associations.some(
      (assoc) => assoc.associationClass === cls.name
    );

    if (!isIntermediate) {
      // Generar archivos de entidades, repositorios, controladores y servicios solo si no es una clase intermedia
      const entityCode = generateEntityCode(
        cls.name,
        cls.attributes,
        relationships,
        associations
      );
      const repoCode = generateRepositoryCode(cls.name);
      const controllerCode = generateControllerCode(cls.name);
      const serviceCode = generateServiceCode(cls.name);

      zip.folder("model").file(`${cls.name}.java`, entityCode);
      zip.folder("repository").file(`${cls.name}Repository.java`, repoCode);
      zip
        .folder("controller")
        .file(`${cls.name}Controller.java`, controllerCode);
      zip.folder("service").file(`${cls.name}Service.java`, serviceCode);
    }
  });

  zip.generateAsync({ type: "blob" }).then(function (content) {
    saveAs(content, "spring_boot_project.zip");
  });
};

// Función para generar el código de la entidad Java en base a los atributos y relaciones
const generateEntityCode = (
  className,
  attributes,
  relationships,
  associations
) => {
  return `
  package com.diagram.demo.model;
  
  import jakarta.persistence.*;
  import lombok.Data;
  import java.io.Serializable;
  import java.util.Set;
  
  @Entity
  @Data
  @Table(name = "${
    className.toLowerCase() === "user" ? "users" : className.toLowerCase()
  }")
  public class ${className} implements Serializable {
  
      @Id
      @GeneratedValue(strategy = GenerationType.SEQUENCE)
      private Long id;
      ${attributes.map((attr) => `private String ${attr};`).join("\n    ")}

      ${relationships
        .filter((rel) => rel.from === className || rel.to === className)
        .map((rel) => generateRelationshipCode(rel, className))
        .join("\n    ")}
      
      ${associations
        .filter(
          (assoc) => assoc.class1 === className || assoc.class2 === className
        )
        .map((assoc) => generateAssociationCode(assoc, className))
        .join("\n    ")}
  }
  `;
};

// Función para generar el código de las relaciones entre entidades
const generateRelationshipCode = (rel, currentClassName) => {
  const { from, to, type, class1Multiplicity, class2Multiplicity } = rel;
  const targetClass = from === currentClassName ? to : from;

  // Lógica para determinar el tipo de relación con base en la multiplicidad
  const manyToMany =
    class1Multiplicity.includes("*") && class2Multiplicity.includes("*");
  const oneToMany =
    class1Multiplicity.includes("1") && class2Multiplicity.includes("*");

  if (manyToMany) {
    return `
    @ManyToMany
    @JoinTable(name = "${currentClassName.toLowerCase()}_${targetClass.toLowerCase()}",
      joinColumns = @JoinColumn(name = "id_${currentClassName.toLowerCase()}"),
      inverseJoinColumns = @JoinColumn(name = "id_${targetClass.toLowerCase()}"))
    private Set<${targetClass}> ${targetClass.toLowerCase()}s;
    `;
  } else if (oneToMany) {
    return `
    @OneToMany(mappedBy = "${currentClassName.toLowerCase()}")
    private Set<${targetClass}> ${targetClass.toLowerCase()}s;
    `;
  } else if (class1Multiplicity === "1" && class2Multiplicity === "1") {
    return `
    @OneToOne
    @JoinColumn(name = "id_${targetClass.toLowerCase()}")
    private ${targetClass} ${targetClass.toLowerCase()};
    `;
  } else {
    if (from === currentClassName) {
      return `
      @ManyToOne
      @JoinColumn(name = "id_${targetClass.toLowerCase()}")
      private ${targetClass} ${targetClass.toLowerCase()};
      `;
    }
  }
};

// Función para generar el código de las asociaciones intermedias (tablas intermedias)
const generateAssociationCode = (assoc, currentClassName) => {
  const {
    class1,
    class2,
    associationClass,
    class1Multiplicity,
    class2Multiplicity,
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

// Función para generar el código del repositorio
const generateRepositoryCode = (className) => {
  return `
  package com.diagram.demo.repository;
  
  import com.diagram.demo.model.${className};
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
  package com.diagram.demo.controller;
  
  import com.diagram.demo.model.${className};
  import com.diagram.demo.service.${className}Service;
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
      public ${className} createOrUpdate(${className} entity) {
          return ${className.toLowerCase()}Service.save(entity);
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
const generateServiceCode = (className) => {
  return `
  package com.diagram.demo.service;
  
  import com.diagram.demo.model.${className};
  import com.diagram.demo.repository.${className}Repository;
  import org.springframework.beans.factory.annotation.Autowired;
  import org.springframework.stereotype.Service;
  
  import java.util.List;
  import java.util.Optional;
  
  @Service
  public class ${className}Service {
      @Autowired
      private ${className}Repository ${className.toLowerCase()}Repository;
  
      public List<${className}> findAll() {
          return ${className.toLowerCase()}Repository.findAll();
      }
  
      public Optional<${className}> findById(Long id) {
          return ${className.toLowerCase()}Repository.findById(id);
      }
  
      public ${className} save(${className} entity) {
          return ${className.toLowerCase()}Repository.save(entity);
      }
  
      public void deleteById(Long id) {
          ${className.toLowerCase()}Repository.deleteById(id);
      }
  }
  `;
};
