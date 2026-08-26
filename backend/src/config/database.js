import mysql from 'mysql2/promise';
import { logger } from '../utils/logger.js';
import { config } from './index.js';

// Database connection pool configuration
function getPoolConfig() {
    return {
        host: config.db.host || process.env.DB_HOST || 'localhost',
        port: config.db.port || parseInt(process.env.DB_PORT || '3306', 10),
        user: config.db.user || process.env.DB_USER || 'root',
        password: config.db.password !== undefined ? config.db.password : (process.env.DB_PASSWORD || ''),
        database: config.db.database || process.env.DB_NAME || 'apfrs_db',
        waitForConnections: true,
        connectionLimit: config.db.poolSize || parseInt(process.env.DB_POOL_SIZE || '10', 10),
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        charset: 'utf8mb4',
        timezone: '+00:00',
        connectTimeout: 10000,
    };
}

class Database {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    async connect() {
        const poolConfig = getPoolConfig();
        try {
            this.pool = mysql.createPool(poolConfig);
            
            // Test connection
            const connection = await this.pool.getConnection();
            this.isConnected = true;
            logger.info('✅ MySQL database connected successfully');
            logger.info(`📊 Database: ${poolConfig.database}@${poolConfig.host}:${poolConfig.port}`);
            logger.info(`👤 User: ${poolConfig.user}`);
            connection.release();

            // Handle pool errors
            this.pool.on('error', (err) => {
                logger.error('MySQL pool error:', err);
                this.isConnected = false;
                if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                    logger.warn('Database connection lost');
                }
            });

            return this.pool;
        } catch (error) {
            this.isConnected = false;
            logger.error('❌ Database connection failed:', error.message);
            logger.error('Please check your .env configuration:');
            logger.error(`  - DB_HOST: ${poolConfig.host}`);
            logger.error(`  - DB_PORT: ${poolConfig.port}`);
            logger.error(`  - DB_USER: ${poolConfig.user}`);
            logger.error(`  - DB_NAME: ${poolConfig.database}`);
            logger.error(`  - DB_PASSWORD: ${poolConfig.password ? '*****' : '(not set)'}`);
            
            // Throw error - strict mode, no fallback
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    async getConnection() {
        if (!this.pool || !this.isConnected) {
            throw new Error('Database is not connected. Please check your configuration.');
        }
        return this.pool.getConnection();
    }

    async query(sql, params = []) {
        if (!this.isConnected) {
            throw new Error('Database is not connected. Please check your configuration.');
        }
        
        const connection = await this.getConnection();
        try {
            const [rows] = await connection.execute(sql, params);
            return rows;
        } catch (error) {
            logger.error('Query error:', { 
                sql: sql.substring(0, 200), 
                params, 
                error: error.message 
            });
            throw error;
        } finally {
            connection.release();
        }
    }

    async transaction(callback) {
        if (!this.isConnected) {
            throw new Error('Database is not connected. Please check your configuration.');
        }
        
        const connection = await this.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            logger.info('Database connection closed');
        }
    }

    async testConnection() {
        try {
            await this.query('SELECT 1+1 as test');
            return true;
        } catch (error) {
            logger.error('Database test failed:', error.message);
            return false;
        }
    }

    getConnectionStatus() {
        const poolConfig = getPoolConfig();
        return {
            isConnected: this.isConnected,
            host: poolConfig.host,
            port: poolConfig.port,
            database: poolConfig.database,
            user: poolConfig.user,
        };
    }
}

export const db = new Database();
export default db;
