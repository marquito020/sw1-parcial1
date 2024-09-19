import { Schema, model } from 'mongoose';
import { User } from '../interface/user.interface';

const userSchema = new Schema<User>({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    }
},
{
    timestamps: true,
    versionKey: false
});

export default model<User>('User', userSchema);