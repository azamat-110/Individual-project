import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {executeQuery} from '../models/database.js';

const router = express.Router();
const JWT_SECRET = 'your-secret-key';
const SALT_ROUNDS = 10;

router.post('/login', async (req, res) => {
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({message: 'Введите email и пароль'});
    }

    try {
        const query = 'SELECT * FROM USERS WHERE EMAIL = :email';
        const result = await executeQuery(query, {email});

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({message: 'Пользователь не найден'});
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.PASSWORD);

        if (!passwordMatch) {
            return res.status(401).json({message: 'Неверный пароль'});
        }

        const token = jwt.sign(
            {userId: user.USER_ID, roleId: user.ROLE_ID},
            JWT_SECRET,
            {expiresIn: '1h'}
        );

        res.json({token, roleId: user.ROLE_ID});
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Ошибка сервера'});
    }
});


router.post('/register', async (req, res) => {
    const {email, password, fullName} = req.body;

    if (!email || !password || !fullName) {
        return res.status(400).json({message: 'Введите полное имя, email и пароль'});
    }

    try {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const defaultRoleId = 3;
        await executeQuery('BEGIN');

        const getMaxPatientIdQuery = `SELECT NVL(MAX(PATIENT_ID), 0) + 1 AS NEW_ID FROM PATIENTS`;
        const maxResult = await executeQuery(getMaxPatientIdQuery);
        const newPatientId = maxResult.rows[0].NEW_ID;

        const getMaxUserIdQuery = `SELECT NVL(MAX(USER_ID), 0) + 1 AS NEW_ID FROM USERS`;
        const maxUserRes = await executeQuery(getMaxUserIdQuery);
        const newUserId = maxUserRes.rows[0].NEW_ID;

        const insertUserQuery = `
            INSERT INTO USERS (USER_ID, EMAIL, PASSWORD, ROLE_ID) 
            VALUES (:newUserId, :email, :password, :roleId)
        `;


        await executeQuery(insertUserQuery, {
            newUserId: newUserId,
            email: email,
            password: hashedPassword,
            roleId: defaultRoleId,
        });

        const insertPatientQuery = `
            INSERT INTO PATIENTS (PATIENT_ID, FULL_NAME, EMAIL)
            VALUES (:newPatientId, :fullName, :email)
        `;
        await executeQuery(insertPatientQuery, {
            newPatientId,
            fullName,
            email,
        });

        await executeQuery('COMMIT');

        res.status(201).json({message: 'Пользователь успешно зарегистрирован'});
    } catch (error) {
        console.error('Ошибка базы данных:', error);
        await executeQuery('ROLLBACK');
        res.status(500).json({message: 'Ошибка сервера'});
    }
});


router.post('/add-patient', async (req, res) => {
    const {email, fullName, phoneNumber, dateOfBirth, gender, disabilityStatus} = req.body;


    if (!email || !fullName || !phoneNumber || !dateOfBirth || !gender || !disabilityStatus) {
        return res.status(400).json({message: 'Заполните все обязательные поля'});
    }

    try {
        const defaultPassword = '12345678';
        const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);
        const defaultRoleId = 3;

        await executeQuery('BEGIN');

        const getMaxPatientIdQuery = `SELECT NVL(MAX(PATIENT_ID), 0) + 1 AS NEW_ID FROM PATIENTS`;
        const maxResult = await executeQuery(getMaxPatientIdQuery);
        const newPatientId = maxResult.rows[0].NEW_ID;

        const getMaxUserIdQuery = `SELECT NVL(MAX(USER_ID), 0) + 1 AS NEW_ID FROM USERS`;
        const maxUserRes = await executeQuery(getMaxUserIdQuery);
        const newUserId = maxUserRes.rows[0].NEW_ID;

        const insertUserQuery = `
            INSERT INTO USERS (USER_ID, EMAIL, PASSWORD, ROLE_ID)
            VALUES (:newUserId, :email, :password, :roleId)
        `;
        await executeQuery(insertUserQuery, {
            newUserId: newUserId,
            email: email,
            password: hashedPassword,
            roleId: defaultRoleId,
        });

        const insertPatientQuery = `
                INSERT INTO PATIENTS 
                (PATIENT_ID, FULL_NAME, EMAIL, CONTACT_INFO, DATE_OF_BIRTH, GENDER, DISABILITY_TYPE) 
                VALUES 
                (:newPatientId, :fullName, :email, :phoneNumber, :dateOfBirth, :gender, :disabilityStatus)
        `;

        await executeQuery(insertPatientQuery, {
            newPatientId: {val: newPatientId},
            fullName: {val: fullName},
            email: {val: email},
            phoneNumber: {val: phoneNumber},
            dateOfBirth: {val: dateOfBirth},
            gender: {val: gender},
            disabilityStatus: {val: disabilityStatus}
        });

        await executeQuery('COMMIT');

        res.status(201).json({message: 'Пациент успешно добавлен', defaultPassword});
    } catch (error) {
        console.error('Ошибка базы данных:', error);
        await executeQuery('ROLLBACK');
        res.status(500).json({message: 'Ошибка сервера'});
    }
});


router.delete('/delete-patient/:patientId', async (req, res) => {
    const {patientId} = req.params;
    if (!patientId) {
        return res.status(400).json({message: 'Не указан идентификатор пациента'});
    }
    try {
        await executeQuery('BEGIN');
        const deletePatientQuery = `
            DECLARE v_email USERS.EMAIL%TYPE;
                BEGIN
            SELECT EMAIL INTO v_email FROM PATIENTS WHERE PATIENT_ID = :patientId;
            DELETE FROM USERS WHERE EMAIL = v_email;
            DELETE FROM PATIENTS WHERE PATIENT_ID = :patientId;
                END;`
        await executeQuery(deletePatientQuery, {patientId: patientId});
        await executeQuery('COMMIT');
        res.status(200).json({message: 'Пациент успешно удалён'});
    } catch (error) {
        console.error('Ошибка базы данных при удалении:', error);
        await executeQuery('ROLLBACK');
        res.status(500).json({message: 'Ошибка сервера при удалении пациента'});
    }
});

// router.post("/update-role", checkRole(["admin"]), async (req, res) => {
//     const {email, newRoleId} = req.body;
//
//     try {
//         const updateRoleQuery = "UPDATE USERS SET ROLE_ID = :newRoleId WHERE EMAIL = :email";
//         await executeQuery(updateRoleQuery, {email, newRoleId});
//
//         // Логика изменения пациента на доктора
//         if (newRoleId === 2) {
//             const transferQuery = `
//         INSERT INTO DOCTORS (DOCTOR_ID, FULL_NAME, EMAIL)
//         SELECT PATIENTS_SEQ.NEXTVAL, FULL_NAME, EMAIL FROM PATIENTS WHERE EMAIL = :email;
//         DELETE FROM PATIENTS WHERE EMAIL = :email;
//       `;
//             await executeQuery(transferQuery, {email});
//         }
//
//         res.json({message: "Роль успешно обновлена"});
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({message: "Ошибка сервера"});
//     }
// });

export default router;
