import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { PoolClient } from 'pg';
import {
  EmployeeUploadedFiles,
  matchDocumentFiles,
  validateDocumentMetadata,
  validateSingleDocumentDuplicates,
} from '../common/document-upload';
import { validateUploadedFile } from '../common/file-validation';
import {
  DOCUMENT_DEFINITIONS,
  DocumentKey,
} from './constants/document.constants';

@Injectable()
export class EmployeeService {
  constructor(private readonly dbService: DbService) { }

  // ===========================
  // GET ALL EMPLOYEES
  // ===========================

  async findAll() {
    const result = await this.dbService.query(`
  SELECT
    e.*,
    d.department_name,
    dg.designation_name
  FROM employees e
  LEFT JOIN departments d
    ON e.department_id = d.id
  LEFT JOIN designations dg
    ON e.designation_id = dg.id
  ORDER BY e.id;
`);

    return result.rows;
  }
  // ===========================
  // GET EMPLOYEE BY ID
  // ===========================

  async findOne(id: string) {
    const employeeResult = await this.dbService.query(
      `
    SELECT
      e.*,
      d.department_name,
      dg.designation_name
    FROM employees e
    LEFT JOIN departments d
      ON e.department_id = d.id
    LEFT JOIN designations dg
      ON e.designation_id = dg.id
    WHERE e.id = $1;
    `,
      [id],
    );

    if (employeeResult.rows.length === 0) {
      throw new NotFoundException('Employee not found');
    }

    const employee = employeeResult.rows[0];

    const personalResult = await this.dbService.query(
      `
    SELECT
      father_name,
      father_aadhaar_number,
      mother_name,
      mother_aadhaar_number,
      marital_status,
      nationality,
      blood_group,
      emergency_contact_name,
      emergency_contact_number,
      emergency_contact_relation
    FROM employee_personal_info
    WHERE employee_id = $1;
    `,
      [id],
    );

    const addressResult = await this.dbService.query(
      `
    SELECT
      id,
      address_type,
      house_no,
      street,
      city,
      state,
      pincode,
      country
    FROM employee_addresses
    WHERE employee_id = $1
    ORDER BY id;
    `,
      [id],
    );

    return {
      ...employee,
      personal_info: personalResult.rows[0] ?? null,
      addresses: addressResult.rows,
    };
  }

  // ===========================
  // CREATE EMPLOYEE
  // ===========================

  async create(
    employeeData: any,
    personalInfo: any,
    addresses: any,
    documents: unknown,
    files: EmployeeUploadedFiles,
  ) {
    const normalizedEmployee = this.normalizeEmployeeData(employeeData);

    const client = await this.dbService.getClient();

    try {
      await client.query('BEGIN');

      // ---------------------------
      // Validate department
      // ---------------------------

      const departmentResult = await client.query(
        `
        SELECT department_code
        FROM departments
        WHERE id = $1;
        `,
        [normalizedEmployee.departmentId],
      );

      if (departmentResult.rows.length === 0) {
        throw new NotFoundException('Department not found');
      }

      // ---------------------------
      // Validate designation
      // ---------------------------

      const designationResult = await client.query(
        `
        SELECT id
        FROM designations
        WHERE id = $1;
        `,
        [normalizedEmployee.designationId],
      );

      if (designationResult.rows.length === 0) {
        throw new NotFoundException('Designation not found');
      }

      // ---------------------------
      // Generate employee code
      // ---------------------------

      const employeeCode = await this.generateEmployeeCode(
        client,
        departmentResult.rows[0].department_code,
      );

      // ---------------------------
      // Create employee
      // ---------------------------

      const employeeResult = await client.query(
        `
        INSERT INTO employees (
          employee_code,
          first_name,
          last_name,
          email,
          phone,
          gender,
          dob,
          joining_date,
          department_id,
          designation_id,
          manager_id,
          employment_type,
          work_location,
          status
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14
        )
        RETURNING id, employee_code;
        `,
        [
          employeeCode,
          normalizedEmployee.firstName,
          normalizedEmployee.lastName,
          normalizedEmployee.email,
          normalizedEmployee.phone,
          normalizedEmployee.gender,
          normalizedEmployee.dob,
          normalizedEmployee.joiningDate,
          normalizedEmployee.departmentId,
          normalizedEmployee.designationId,
          normalizedEmployee.managerId,
          normalizedEmployee.employmentType,
          normalizedEmployee.workLocation,
          normalizedEmployee.status ?? 'Active',
        ],
      );

      const employeeId = employeeResult.rows[0].id;



      // ==========================================
      // CREATE SHARED LEAVE ALLOCATION
      // ==========================================

      await client.query(
        `
  INSERT INTO leave_allocations (
    employee_id,
    leave_type_id,
    leave_period_id,
    total_leaves_allocated,
    carry_forward_leaves,
    used_leaves,
    remaining_leaves
  )
  VALUES (
    $1,
    NULL,
    $2,
    21,
    0,
    0,
    21
  )
  `,
        [
          employeeId,
          1, // current leave period
        ],
      );
      // ---------------------------
      // Personal information
      // ---------------------------

      await client.query(
        `
        INSERT INTO employee_personal_info (
          employee_id,
          father_name,
          father_aadhaar_number,
          mother_name,
          mother_aadhaar_number,
          marital_status,
          nationality,
          blood_group,
          emergency_contact_name,
          emergency_contact_number,
          emergency_contact_relation
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11
        );
        `,
        [
          employeeId,
          personalInfo?.fatherName,
          personalInfo?.fatherAadhaarNumber,
          personalInfo?.motherName,
          personalInfo?.motherAadhaarNumber,
          personalInfo?.maritalStatus,
          personalInfo?.nationality,
          personalInfo?.bloodGroup,
          personalInfo?.emergencyContactName,
          personalInfo?.emergencyContactNumber,
          personalInfo?.emergencyContactRelation,
        ],
      );

      // ---------------------------
      // Address validation
      // ---------------------------

      const { currentAddress, permanentAddress } =
        this.resolveAddresses(addresses);

      // ---------------------------
      // Current address
      // ---------------------------

      await client.query(
        `
        INSERT INTO employee_addresses (
          employee_id,
          address_type,
          house_no,
          street,
          city,
          state,
          pincode,
          country
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `,
        [
          employeeId,
          'Current',
          currentAddress.houseNo,
          currentAddress.street,
          currentAddress.city,
          currentAddress.state,
          currentAddress.pincode,
          currentAddress.country,
        ],
      );

      // ---------------------------
      // Permanent address
      // ---------------------------

      await client.query(
        `
        INSERT INTO employee_addresses (
          employee_id,
          address_type,
          house_no,
          street,
          city,
          state,
          pincode,
          country
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
        `,
        [
          employeeId,
          'Permanent',
          permanentAddress.houseNo,
          permanentAddress.street,
          permanentAddress.city,
          permanentAddress.state,
          permanentAddress.pincode,
          permanentAddress.country,
        ],
      );

      // ===========================
      // DOCUMENT VALIDATION
      // ===========================

      validateDocumentMetadata(documents);

      if (documents.length === 0) {
        throw new BadRequestException(
          'Employee registration requires documents',
        );
      }

      validateSingleDocumentDuplicates(documents);

      const documentKeys = documents.map(
        (document) => document.documentKey as DocumentKey,
      );

      const hasDocument = (key: DocumentKey) => documentKeys.includes(key);

      // ---------------------------
      // Required documents
      // ---------------------------

      const requiredDocuments: DocumentKey[] = [
        'PROFILE_PHOTO',
        'AADHAAR',
        'PAN',
        'TENTH',
        'DEGREE',
        'RESUME',
      ];

      for (const key of requiredDocuments) {
        if (!hasDocument(key)) {
          throw new BadRequestException(
            `${DOCUMENT_DEFINITIONS[key].name} is required`,
          );
        }
      }

      // ---------------------------
      // Education path
      // ---------------------------

      const hasIntermediate = hasDocument('INTERMEDIATE');
      const hasDiploma = hasDocument('DIPLOMA');

      if (hasIntermediate && hasDiploma) {
        throw new BadRequestException(
          'Employee cannot have both Intermediate and Diploma certificates',
        );
      }

      if (!hasIntermediate && !hasDiploma) {
        throw new BadRequestException(
          'Either Intermediate or Diploma certificate is required',
        );
      }

      // ---------------------------
      // Match files to metadata
      // ---------------------------

      const matchedFiles = matchDocumentFiles(documents, files ?? {});

      // ---------------------------
      // Validate and store files
      // ---------------------------

      for (const { document, file } of matchedFiles) {
        validateUploadedFile(file, document.documentKey);

        const definition = DOCUMENT_DEFINITIONS[document.documentKey];

        await client.query(
          `
          INSERT INTO employee_documents (
            employee_id,
            document_name,
            document_type,
            original_file_name,
            mime_type,
            file_data
          )
          VALUES ($1, $2, $3, $4, $5, $6);
          `,
          [
            employeeId,
            definition.name,
            definition.type,
            file.originalname,
            file.mimetype,
            file.buffer,
          ],
        );
      }

      await client.query('COMMIT');

      return {
        message: 'Employee registered successfully',
        employeeId,
        employeeCode: employeeResult.rows[0].employee_code,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ===========================
  // GENERATE EMPLOYEE CODE
  // ===========================

  private async generateEmployeeCode(
    client: PoolClient,
    departmentCode: string,
  ): Promise<string> {
    const currentYear = new Date().getFullYear();

    const employeeResult = await client.query(
      `
      SELECT employee_code
      FROM employees
      WHERE employee_code LIKE $1
      ORDER BY id DESC
      LIMIT 1;
      `,
      [`${departmentCode}-${currentYear}-%`],
    );

    let sequenceNumber = 1;

    if (employeeResult.rows.length > 0) {
      const lastEmployeeCode = employeeResult.rows[0].employee_code;
      const lastSequence = Number(lastEmployeeCode.split('-')[2]);

      if (!Number.isNaN(lastSequence)) {
        sequenceNumber = lastSequence + 1;
      }
    }

    const formattedSequence = sequenceNumber.toString().padStart(4, '0');

    return `${departmentCode}-${currentYear}-${formattedSequence}`;
  }

  // ===========================
  // UPDATE EMPLOYEE
  // ===========================
  async update(
    id: string,
    payload: any,
    files: EmployeeUploadedFiles,
  ) {
    const client = await this.dbService.getClient();

    try {
      await client.query('BEGIN');

      // ===========================
      // GET EXISTING EMPLOYEE
      // ===========================

      const existingResult = await client.query(
        `
      SELECT *
      FROM employees
      WHERE id = $1;
      `,
        [id],
      );

      if (existingResult.rows.length === 0) {
        throw new NotFoundException('Employee not found');
      }

      const existing = existingResult.rows[0];

      // ===========================
      // SEPARATE DATA
      // ===========================

      const employeeData =
        payload?.employeeData ?? payload ?? {};

      const personalInfo =
        payload?.personalInfo ?? {};

      const addresses =
        payload?.addresses ?? {};

      // ===========================
      // NORMALIZE EMPLOYEE
      // ===========================

      const normalizedEmployee =
        this.normalizeEmployeeData(
          employeeData,
          existing,
        );

      // ===========================
      // VALIDATE DEPARTMENT
      // ===========================

      const departmentResult = await client.query(
        `
      SELECT id
      FROM departments
      WHERE id = $1;
      `,
        [normalizedEmployee.departmentId],
      );

      if (departmentResult.rows.length === 0) {
        throw new NotFoundException('Department not found');
      }

      // ===========================
      // VALIDATE DESIGNATION
      // ===========================

      const designationResult = await client.query(
        `
      SELECT id
      FROM designations
      WHERE id = $1;
      `,
        [normalizedEmployee.designationId],
      );

      if (designationResult.rows.length === 0) {
        throw new NotFoundException('Designation not found');
      }

      // ===========================
      // VALIDATE REPORTING MANAGER
      // ===========================

      if (normalizedEmployee.managerId !== null) {
        const managerResult = await client.query(
          `
        SELECT id
        FROM employees
        WHERE id = $1;
        `,
          [normalizedEmployee.managerId],
        );

        if (managerResult.rows.length === 0) {
          throw new NotFoundException(
            'Reporting Manager not found',
          );
        }

        // Employee cannot report to themselves
        if (
          String(normalizedEmployee.managerId) ===
          String(id)
        ) {
          throw new BadRequestException(
            'Employee cannot be their own Reporting Manager',
          );
        }
      }

      // ===========================
      // UPDATE EMPLOYEE
      // ===========================

      await client.query(
        `
      UPDATE employees
      SET
        first_name = $1,
        last_name = $2,
        email = $3,
        phone = $4,
        gender = $5,
        dob = $6,
        joining_date = $7,
        department_id = $8,
        designation_id = $9,
        manager_id = $10,
        employment_type = $11,
        work_location = $12,
        status = COALESCE($13, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14;
      `,
        [
          normalizedEmployee.firstName,
          normalizedEmployee.lastName,
          normalizedEmployee.email,
          normalizedEmployee.phone,
          normalizedEmployee.gender,
          normalizedEmployee.dob,
          normalizedEmployee.joiningDate,
          normalizedEmployee.departmentId,
          normalizedEmployee.designationId,
          normalizedEmployee.managerId,
          normalizedEmployee.employmentType,
          normalizedEmployee.workLocation,
          normalizedEmployee.status,
          id,
        ],
      );

      // ===========================
      // UPDATE PERSONAL INFORMATION
      // ===========================

      const personalExists = await client.query(
        `
      SELECT employee_id
      FROM employee_personal_info
      WHERE employee_id = $1;
      `,
        [id],
      );

      const personalValues = [
        personalInfo?.fatherName ?? null,
        personalInfo?.fatherAadhaarNumber ?? null,
        personalInfo?.motherName ?? null,
        personalInfo?.motherAadhaarNumber ?? null,
        personalInfo?.maritalStatus ?? null,
        personalInfo?.nationality ?? null,
        personalInfo?.bloodGroup ?? null,
        personalInfo?.emergencyContactName ?? null,
        personalInfo?.emergencyContactNumber ?? null,
        personalInfo?.emergencyContactRelation ?? null,
      ];

      if (personalExists.rows.length > 0) {
        await client.query(
          `
        UPDATE employee_personal_info
        SET
          father_name = $1,
          father_aadhaar_number = $2,
          mother_name = $3,
          mother_aadhaar_number = $4,
          marital_status = $5,
          nationality = $6,
          blood_group = $7,
          emergency_contact_name = $8,
          emergency_contact_number = $9,
          emergency_contact_relation = $10
        WHERE employee_id = $11;
        `,
          [...personalValues, id],
        );
      } else {
        await client.query(
          `
        INSERT INTO employee_personal_info (
          employee_id,
          father_name,
          father_aadhaar_number,
          mother_name,
          mother_aadhaar_number,
          marital_status,
          nationality,
          blood_group,
          emergency_contact_name,
          emergency_contact_number,
          emergency_contact_relation
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11
        );
        `,
          [id, ...personalValues],
        );
      }

      // ===========================
      // UPDATE ADDRESSES
      // ===========================

      const permanentAddress =
        addresses?.permanentAddress;

      const currentAddress =
        addresses?.currentAddress;

      if (
        permanentAddress &&
        typeof permanentAddress === 'object'
      ) {
        this.validateAddressFields(
          permanentAddress,
          'Permanent address',
        );

        await this.upsertEmployeeAddress(
          client,
          id,
          'Permanent',
          permanentAddress,
        );
      }

      if (
        currentAddress &&
        typeof currentAddress === 'object'
      ) {
        this.validateAddressFields(
          currentAddress,
          'Current address',
        );

        await this.upsertEmployeeAddress(
          client,
          id,
          'Current',
          currentAddress,
        );
      }
      // ===========================
      // UPDATE DOCUMENTS
      // ===========================

      const documents = payload?.documentsMetadata ?? [];

      if (documents.length > 0) {
        validateDocumentMetadata(documents);
        validateSingleDocumentDuplicates(documents);

        const matchedFiles = matchDocumentFiles(
          documents,
          files ?? {},
        );

        for (const { document, file } of matchedFiles) {

          // No new file selected
          // Keep existing file
          if (!file) {
            continue;
          }

          // New file selected
          validateUploadedFile(
            file,
            document.documentKey,
          );

          const definition =
            DOCUMENT_DEFINITIONS[
            document.documentKey as DocumentKey
            ];

          // Remove old document
          await client.query(
            `
      DELETE FROM employee_documents
      WHERE employee_id = $1
        AND document_name = $2
        AND document_type = $3;
      `,
            [
              id,
              definition.name,
              definition.type,
            ],
          );

          // Save new file
          await client.query(
            `
      INSERT INTO employee_documents (
        employee_id,
        document_name,
        document_type,
        original_file_name,
        mime_type,
        file_data
      )
      VALUES ($1, $2, $3, $4, $5, $6);
      `,
            [
              id,
              definition.name,
              definition.type,
              file.originalname,
              file.mimetype,
              file.buffer,
            ],
          );
        }
      }
      // ===========================
      // GET UPDATED EMPLOYEE
      // ===========================

      const updatedResult = await client.query(
        `
      SELECT
        e.*,
        d.department_name,
        dg.designation_name
      FROM employees e
      LEFT JOIN departments d
        ON e.department_id = d.id
      LEFT JOIN designations dg
        ON e.designation_id = dg.id
      WHERE e.id = $1;
      `,
        [id],
      );

      const personalResult = await client.query(
        `
      SELECT
        father_name,
        father_aadhaar_number,
        mother_name,
        mother_aadhaar_number,
        marital_status,
        nationality,
        blood_group,
        emergency_contact_name,
        emergency_contact_number,
        emergency_contact_relation
      FROM employee_personal_info
      WHERE employee_id = $1;
      `,
        [id],
      );

      const addressResult = await client.query(
        `
      SELECT
        id,
        address_type,
        house_no,
        street,
        city,
        state,
        pincode,
        country
      FROM employee_addresses
      WHERE employee_id = $1
      ORDER BY id;
      `,
        [id],
      );

      await client.query('COMMIT');

      return {
        message: 'Employee updated successfully',
        employee: {
          ...updatedResult.rows[0],
          personal_info:
            personalResult.rows[0] ?? null,
          addresses:
            addressResult.rows,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  // ===========================
  // UPSERT EMPLOYEE ADDRESS
  // ===========================

  private async upsertEmployeeAddress(
    client: PoolClient,
    employeeId: string,
    addressType: 'Current' | 'Permanent',
    address: any,
  ) {
    const existingResult = await client.query(
      `
    SELECT id
    FROM employee_addresses
    WHERE employee_id = $1
      AND LOWER(address_type) = LOWER($2)
    LIMIT 1;
    `,
      [employeeId, addressType],
    );

    if (existingResult.rows.length > 0) {

      // UPDATE existing address
      await client.query(
        `
      UPDATE employee_addresses
      SET
        house_no = $1,
        street = $2,
        city = $3,
        state = $4,
        pincode = $5,
        country = $6
      WHERE id = $7;
      `,
        [
          address.houseNo,
          address.street,
          address.city,
          address.state,
          address.pincode,
          address.country,
          existingResult.rows[0].id,
        ],
      );

    } else {

      // INSERT new address
      await client.query(
        `
      INSERT INTO employee_addresses (
        employee_id,
        address_type,
        house_no,
        street,
        city,
        state,
        pincode,
        country
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
      `,
        [
          employeeId,
          addressType,
          address.houseNo,
          address.street,
          address.city,
          address.state,
          address.pincode,
          address.country,
        ],
      );
    }
  }


  // ===========================
  // DELETE EMPLOYEE
  // ===========================

  async remove(id: string) {
    const result = await this.dbService.query(
      `
    UPDATE employees
    SET
      status = 'Inactive',
      deleted_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
      AND status <> 'Inactive'
    RETURNING *;
    `,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Active employee not found');
    }

    return {
      message: 'Employee deactivated successfully',
      employee: result.rows[0],
    };
  }
  // ===========================
  // NORMALIZE EMPLOYEE DATA
  // ===========================
  // ===========================
  // MANAGER ID NORMALIZATION
  // ===========================

  private normalizeManagerId(value: unknown): number | null {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const managerId = Number(value);

    if (Number.isNaN(managerId)) {
      throw new BadRequestException(
        'Invalid Reporting Manager',
      );
    }

    return managerId;
  }

  private normalizeEmployeeData(employee: any, existing: any = {}) {
    const source = employee ?? {};

    return {
      firstName: source.firstName ?? source.first_name ?? existing.first_name,

      lastName: source.lastName ?? source.last_name ?? existing.last_name,

      email: source.email ?? existing.email,

      phone: source.phone ?? existing.phone,

      gender: source.gender ?? existing.gender,

      dob: this.normalizeDate(source.dob ?? existing.dob),

      joiningDate: this.normalizeDate(
        source.joiningDate ?? source.joining_date ?? existing.joining_date,
      ),

      departmentId:
        source.departmentId ?? source.department_id ?? existing.department_id,

      designationId:
        source.designationId ??
        source.designation_id ??
        existing.designation_id,
      managerId: this.normalizeManagerId(
        source.managerId ??
        source.manager_id ??
        existing.manager_id ??
        null,
      ),
      employmentType:
        source.employmentType ??
        source.employment_type ??
        existing.employment_type,

      workLocation:
        source.workLocation ?? source.work_location ?? existing.work_location,

      status: source.status ?? existing.status ?? 'Active',
    };
  }

  // ===========================
  // DATE NORMALIZATION
  // ===========================

  private normalizeDate(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value !== 'string') {
      return String(value);
    }

    // Preserve API date-only values exactly.
    //
    // Example:
    // "2001-07-21"
    // remains
    // "2001-07-21"
    //
    // This prevents an unnecessary timezone conversion.
    const dateOnlyMatch = value.match(/^(\d{4}-\d{2}-\d{2})$/);

    if (dateOnlyMatch) {
      return dateOnlyMatch[1];
    }

    // If an ISO timestamp is received, extract the date
    // portion instead of converting it through local timezone.
    const isoDateMatch = value.match(/^(\d{4}-\d{2}-\d{2})T/);

    if (isoDateMatch) {
      return isoDateMatch[1];
    }

    return value;
  }

  // ===========================
  // ADDRESS RESOLUTION
  // ===========================

  private resolveAddresses(addresses: any) {
    if (!addresses || typeof addresses !== 'object') {
      throw new BadRequestException('Addresses information is required');
    }

    const currentAddress = addresses.currentAddress;

    if (!currentAddress || typeof currentAddress !== 'object') {
      throw new BadRequestException('Current address is required');
    }

    const sameAsCurrentAddress = addresses.sameAsCurrentAddress === true;

    const permanentAddress = sameAsCurrentAddress
      ? currentAddress
      : addresses.permanentAddress;

    if (!permanentAddress || typeof permanentAddress !== 'object') {
      throw new BadRequestException(
        'Permanent address is required when sameAsCurrentAddress is false',
      );
    }

    this.validateAddressFields(currentAddress, 'Current address');

    this.validateAddressFields(permanentAddress, 'Permanent address');

    return {
      currentAddress,
      permanentAddress,
    };
  }

  // ===========================
  // ADDRESS FIELD VALIDATION
  // ===========================

  private validateAddressFields(address: any, addressLabel: string) {
    const requiredFields = [
      'houseNo',
      'street',
      'city',
      'state',
      'pincode',
      'country',
    ];

    for (const field of requiredFields) {
      const value = address?.[field];

      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ''
      ) {
        throw new BadRequestException(`${addressLabel} ${field} is required`);
      }
    }
  }
}
