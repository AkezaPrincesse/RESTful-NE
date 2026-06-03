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
  createExtinguisher: Joi.object({
    serial_number: Joi.string().max(100).required(),
    location: Joi.string().max(255).required(),
    type: Joi.string().valid('Water', 'CO2', 'Foam', 'Dry Chemical').required(),
    size: Joi.string().valid('2.5 lbs', '5 lbs', '9 lbs', '12 lbs').required(),
    installation_date: Joi.date().iso().required(),
    expiry_date: Joi.date().iso().greater(Joi.ref('installation_date')).required(),
    status: Joi.string().valid('Active', 'Inactive', 'Expired', 'Under Maintenance', 'Decommissioned').default('Active'),
    manufacturer: Joi.string().max(100).optional().allow(''),
    model: Joi.string().max(100).optional().allow(''),
    notes: Joi.string().optional().allow(''),
    next_inspection_date: Joi.date().iso().optional(),
  }),
  updateExtinguisher: Joi.object({
    location: Joi.string().max(255).optional(),
    type: Joi.string().valid('Water', 'CO2', 'Foam', 'Dry Chemical').optional(),
    size: Joi.string().valid('2.5 lbs', '5 lbs', '9 lbs', '12 lbs').optional(),
    installation_date: Joi.date().iso().optional(),
    expiry_date: Joi.date().iso().optional(),
    status: Joi.string().valid('Active', 'Inactive', 'Expired', 'Under Maintenance', 'Decommissioned').optional(),
    manufacturer: Joi.string().max(100).optional().allow(''),
    model: Joi.string().max(100).optional().allow(''),
    notes: Joi.string().optional().allow(''),
    next_inspection_date: Joi.date().iso().optional(),
  }),
};

module.exports = { validate, schemas };
