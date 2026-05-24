-- 水管维修工数据库建表脚本

CREATE DATABASE IF NOT EXISTS xiushuiguan DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE xiushuiguan;

-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `openid` VARCHAR(64) NOT NULL COMMENT '微信openid',
    `nickname` VARCHAR(64) DEFAULT '水管工' COMMENT '昵称',
    `avatar_url` VARCHAR(512) DEFAULT '' COMMENT '头像URL',
    `highest_level` INT DEFAULT 0 COMMENT '最高通关关卡',
    `total_stars` INT DEFAULT 0 COMMENT '总星数',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_openid` (`openid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 游戏记录表
CREATE TABLE IF NOT EXISTS `game_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `user_id` BIGINT NOT NULL COMMENT '用户ID',
    `level` INT NOT NULL COMMENT '关卡号',
    `stars` INT DEFAULT 0 COMMENT '获得星数(1-3)',
    `time_used` INT DEFAULT 0 COMMENT '用时(秒)',
    `is_win` TINYINT(1) DEFAULT 0 COMMENT '是否胜利(0否1是)',
    `fail_reason` VARCHAR(256) DEFAULT NULL COMMENT '失败原因',
    `score` INT DEFAULT 0 COMMENT '得分',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏记录表';

-- 游戏配置表
CREATE TABLE IF NOT EXISTS `game_config` (
    `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `config_key` VARCHAR(64) NOT NULL COMMENT '配置键',
    `config_value` VARCHAR(512) NOT NULL COMMENT '配置值',
    `description` VARCHAR(256) DEFAULT '' COMMENT '配置描述',
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏配置表';

-- 初始配置数据
INSERT INTO `game_config` (`config_key`, `config_value`, `description`) VALUES
('wx_appid', '', '微信小程序AppID'),
('wx_secret', '', '微信小程序AppSecret'),
('max_level', '10000', '最大关卡数'),
('version', '1.0.0', '游戏版本号');
