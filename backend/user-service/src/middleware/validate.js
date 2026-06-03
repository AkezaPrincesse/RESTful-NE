const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/['"]/g, ''),
    }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

const schemas = {
  register: Joi.object({
    first_name: Joi.string().min(2).max(100).required().label('First name'),
    last_name: Joi.string().min(2).max(100).required().label('Last name'),
    email: Joi.string().email().required().label('Email'),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
      })
      .label('Password'),
    phone: Joi.string().optional().allow(''),
    department: Joi.string().optional().allow(''),
    role: Joi.string().valid('admin', 'inspector', 'user').default('user'),
  }),

  createAdmin: Joi.object({
    first_name: Joi.string().min(2).max(100).required().label('First name'),
    last_name: Joi.string().min(2).max(100).required().label('Last name'),
    email: Joi.string().email().required().label('Email'),
    password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
      })
      .label('Password'),
    phone: Joi.string().optional().allow(''),
    department: Joi.string().optional().allow(''),
  }),

  createInspector: Joi.object({
    first_name:  Joi.string().min(2).max(100).required().label('First name'),
    last_name:   Joi.string().min(2).max(100).required().label('Last name'),
    email:       Joi.string().email().required().label('Email'),
    phone:       Joi.string().optional().allow(''),
    department:  Joi.string().optional().allow(''),
  }),

  updateInspector: Joi.object({
    first_name:  Joi.string().min(2).max(100).optional(),
    last_name:   Joi.string().min(2).max(100).optional(),
    phone:       Joi.string().optional().allow(''),
    department:  Joi.string().optional().allow(''),
    is_active:   Joi.boolean().optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    first_name: Joi.string().min(2).max(100).optional(),
    last_name: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().optional().allow(''),
    department: Joi.string().optional().allow(''),
  }),

  changePassword: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
      }),
    confirm_password: Joi.string().valid(Joi.ref('new_password')).required().messages({
      'any.only': 'Passwords do not match',
    }),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    new_password: Joi.string()
      .min(8)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required(),
    confirm_password: Joi.string().valid(Joi.ref('new_password')).required().messages({
      'any.only': 'Passwords do not match',
    }),
  }),
};

module.exports = { validate, schemas };
