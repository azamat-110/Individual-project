import {executeQuery} from '../models/database.js';

const getAllMedications = async (req, res) => {
    try {
        const result = await executeQuery('SELECT * FROM MEDICATIONS');
        res.json(result.rows);
    } catch (err) {
        console.log(err);
    }
}

//
// const createMedication = async (req, res) => {
//     const {full_name, date_of_birth, gender, contact_info, disability_type} = req.body;
//     try {
//         await executeQuery(
//             ` INSERT INTO patients (full_name, date_of_birth, gender, contact_info,
//             disability_type) VALUES (:full_name, :date_of_birth, :gender, :contact_info, :disability_type)`,
//             {full_name, date_of_birth, gender, contact_info, disability_type}
//         );
//         res.status(201).send('Пациент добавлен.');
//     } catch (error) {
//         res.status(500).send('Ошибка при добавлении пациента.');
//     }
// }

export default {getAllMedications};
